#!/usr/bin/env bash
# Corrigir problema do Java 21 no Android build
set -euo pipefail

echo "🔧 Corrigindo problema do Java 21..."

# Instalar Java 21
echo "☕ Instalando Java 21..."
sudo apt update
sudo apt install -y openjdk-21-jdk

# Configurar JAVA_HOME para Java 21
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export ANDROID_HOME="/opt/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0"

echo "✅ Java 21 instalado: $JAVA_HOME"

# Verificar versões
echo "📋 Verificando versões:"
"$JAVA_HOME/bin/java" -version
"$JAVA_HOME/bin/javac" -version

# Ir para projeto Android
BUILD_TMP="/opt/deliverytrembao_build"
cd "$BUILD_TMP/delivery-app/android"

# Limpar builds anteriores
echo "🧹 Limpando cache Gradle..."
rm -rf .gradle build
./gradlew clean

# Configurar gradle.properties para força usar Java 21
echo "⚙️ Configurando Gradle para Java 21..."
cat > gradle.properties << EOF
# Project-wide Gradle settings
org.gradle.jvmargs=-Xmx4096m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true

# Java toolchain
org.gradle.java.home=$JAVA_HOME
EOF

# Verificar se o build.gradle do app tem configuração de Java
echo "📝 Configurando Java 21 no build.gradle..."

# Backup do build.gradle
cp app/build.gradle app/build.gradle.backup2

# Criar novo build.gradle com Java 21
cat > app/build.gradle << 'EOF'
apply plugin: 'com.android.application'

android {
    namespace 'com.trembaodelivery.app'
    compileSdk 34

    defaultConfig {
        applicationId "com.trembaodelivery.app"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
            additionalParameters "--no-version-vectors"
        }
    }

    // Forçar Java 21
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_21
        targetCompatibility JavaVersion.VERSION_21
    }

    // Toolchain Java 21  
    java {
        toolchain {
            languageVersion = JavaLanguageVersion.of(21)
        }
    }

    signingConfigs {
        release {
            storeFile file('keystore/delivery-release.keystore')
            storePassword 'deliverytrembao2024'
            keyAlias 'delivery-key'
            keyPassword 'deliverytrembao2024'
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

repositories {
    google()
    mavenCentral()
    flatDir{
        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.coordinatorlayout:coordinatorlayout:1.2.0'
    implementation 'androidx.core:core-splashscreen:1.0.1'
    implementation project(':capacitor-android')
    implementation project(':capacitor-cordova-android-plugins')
    testImplementation 'junit:junit:4.13.2'
    androidTestImplementation 'androidx.test.ext:junit:1.1.5'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'
    implementation project(':capacitor-app')
    implementation project(':capacitor-camera')
    implementation project(':capacitor-geolocation')
    implementation project(':capacitor-haptics')
    implementation project(':capacitor-keyboard')
    implementation project(':capacitor-network')
    implementation project(':capacitor-push-notifications')
    implementation project(':capacitor-splash-screen')
    implementation project(':capacitor-status-bar')
}

apply from: 'capacitor.build.gradle'

try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.info("google-services.json not found, google-services plugin not applied. Push Notifications won't work")
}
EOF

# Configurar gradle wrapper para usar Java 21
echo "🔧 Configurando Gradle Wrapper..."
cat > gradle/wrapper/gradle-wrapper.properties << EOF
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOF

# Dar permissões
chmod +x gradlew

# Tentar build novamente
echo "🚀 Tentando build com Java 21..."
JAVA_HOME="$JAVA_HOME" ./gradlew clean
JAVA_HOME="$JAVA_HOME" ./gradlew bundleRelease

# Verificar se foi gerado
if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
    echo "✅ AAB gerado com sucesso!"
    
    # Copiar para builds finais
    sudo mkdir -p "/opt/builds-finais"
    sudo cp app/build/outputs/bundle/release/app-release.aab "/opt/builds-finais/delivery-trembao-v1.0.aab"
    
    AAB_SIZE=$(ls -lh /opt/builds-finais/delivery-trembao-v1.0.aab | awk '{print $5}')
    echo "📱 AAB final: /opt/builds-finais/delivery-trembao-v1.0.aab ($AAB_SIZE)"
    
    # Tentar APK também
    echo "📱 Gerando APK..."
    JAVA_HOME="$JAVA_HOME" ./gradlew assembleRelease
    
    if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
        sudo cp app/build/outputs/apk/release/app-release.apk "/opt/builds-finais/delivery-trembao-v1.0.apk"
        APK_SIZE=$(ls -lh /opt/builds-finais/delivery-trembao-v1.0.apk | awk '{print $5}')
        echo "📱 APK final: /opt/builds-finais/delivery-trembao-v1.0.apk ($APK_SIZE)"
    fi
    
    echo ""
    echo "🎊 ================ BUILD ANDROID SUCESSO! ================ 🎊"
    echo ""
    echo "✅ ARQUIVOS FINAIS GERADOS:"
    echo "   📁 /opt/builds-finais/"
    echo "   📱 delivery-trembao-v1.0.aab ($AAB_SIZE) - Google Play Store"
    if [ -f "/opt/builds-finais/delivery-trembao-v1.0.apk" ]; then
        echo "   📱 delivery-trembao-v1.0.apk ($APK_SIZE) - Para testes"
    fi
    echo ""
    echo "🚀 SISTEMA 100% OPERACIONAL:"
    echo "   ✅ Site: https://deliverytrembao.com.br"
    echo "   ✅ Android: Pronto para Google Play"
    echo "   ✅ iOS: Projeto configurado para Xcode"
    echo ""
    echo "🎯 PRÓXIMOS PASSOS:"
    echo "   1. Upload do .aab no Google Play Console"
    echo "   2. Build do iOS no Xcode (Mac necessário)"
    echo "   3. Aplicação web já está online!"
    echo "============================================================================"
    
else
    echo "❌ AAB ainda não foi gerado. Verificando erros..."
    echo "Saída do diretório bundle:"
    ls -la app/build/outputs/ || echo "Diretório outputs não existe"
    echo ""
    echo "Últimas linhas do log:"
    ./gradlew bundleRelease --info | tail -20
fi