#!/bin/bash
# Criar keystore de debug para Android
keytool -genkey -v -keystore android/app/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
echo "Keystore criada com sucesso em android/app/debug.keystore"