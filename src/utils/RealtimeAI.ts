import { supabase } from '@/integrations/supabase/client';

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      console.log('Starting audio recording...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      console.log('Audio recording started successfully');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    console.log('Stopping audio recording...');
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    console.log('Audio recording stopped');
  }
}

export class RealtimeAIChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private recorder: AudioRecorder | null = null;
  private isConnected = false;
  private functionCallBuffer: { [key: string]: string } = {};
  private detectedGender: 'male' | 'female' | null = null;
  private genderAnalysisCount = 0;
  private readonly GENDER_ANALYSIS_SAMPLES = 10; // Analyze 10 samples before deciding
  private genderConfidenceScore = 0;

  constructor(
    private onMessage: (message: any) => void, 
    private onConnectionChange: (connected: boolean) => void,
    private onFunctionCall?: (functionName: string, args: any) => Promise<string>,
    private onGenderDetected?: (gender: 'male' | 'female', assistant: string) => void
  ) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    document.body.appendChild(this.audioEl);
  }

  // Gender detection through voice frequency analysis
  private analyzeVoiceGender(audioData: Float32Array): { gender: 'male' | 'female'; confidence: number } {
    // Calculate fundamental frequency (F0) using autocorrelation
    const sampleRate = 24000;
    const minF0 = 50; // Minimum expected F0 for males
    const maxF0 = 400; // Maximum expected F0 for females
    
    // Simple autocorrelation for pitch detection
    const autocorrelation = (data: Float32Array, maxLag: number) => {
      const result = new Array(maxLag);
      for (let lag = 0; lag < maxLag; lag++) {
        let sum = 0;
        for (let i = 0; i < data.length - lag; i++) {
          sum += data[i] * data[i + lag];
        }
        result[lag] = sum / (data.length - lag);
      }
      return result;
    };
    
    // Calculate autocorrelation
    const maxLag = Math.floor(sampleRate / minF0);
    const minLag = Math.floor(sampleRate / maxF0);
    const corr = autocorrelation(audioData, maxLag);
    
    // Find the peak in autocorrelation (fundamental frequency)
    let maxCorr = 0;
    let bestLag = 0;
    for (let i = minLag; i < maxLag; i++) {
      if (corr[i] > maxCorr) {
        maxCorr = corr[i];
        bestLag = i;
      }
    }
    
    // Calculate fundamental frequency
    const f0 = bestLag > 0 ? sampleRate / bestLag : 0;
    
    console.log('🎵 Voice analysis - F0:', f0.toFixed(2), 'Hz');
    
    // Gender classification based on typical F0 ranges with confidence
    // Males: 85-155 Hz, Females: 165-265 Hz
    let gender: 'male' | 'female';
    let confidence: number;
    
    if (f0 < 120) {
      gender = 'male';
      confidence = Math.max(0.5, Math.min(1, (120 - f0) / 35)); // Higher confidence for lower frequencies
    } else if (f0 > 180) {
      gender = 'female';
      confidence = Math.max(0.5, Math.min(1, (f0 - 180) / 85)); // Higher confidence for higher frequencies
    } else {
      // Ambiguous range (120-180 Hz) - analyze spectral characteristics
      let sum = 0;
      let weightedSum = 0;
      for (let i = 0; i < audioData.length; i++) {
        const magnitude = Math.abs(audioData[i]);
        sum += magnitude;
        weightedSum += magnitude * i;
      }
      const spectralCentroid = sum > 0 ? weightedSum / sum : 0;
      
      console.log('🎵 Spectral centroid:', spectralCentroid);
      
      // Higher spectral centroid typically indicates female voice
      if (spectralCentroid > audioData.length * 0.35) {
        gender = 'female';
        confidence = 0.6; // Moderate confidence
      } else {
        gender = 'male';
        confidence = 0.6; // Moderate confidence
      }
    }
    
    return { gender, confidence };
  }

  async init() {
    try {
      console.log('Initializing Realtime AI Chat with gender detection...');
      
      // Get ephemeral token from our Supabase Edge Function
      console.log('Requesting ephemeral token...');
      const { data, error } = await supabase.functions.invoke("realtime-ai-chat-dynamic", {
        body: { detectedGender: null } // Will default to female voice initially
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Failed to get ephemeral token: ${error.message}`);
      }
      
      if (!data?.client_secret?.value) {
        console.error('Invalid response from edge function:', data);
        throw new Error("Failed to get ephemeral token from response");
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      console.log('Ephemeral token received successfully');

      // Create peer connection
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      // Set up connection state monitoring
      this.pc.onconnectionstatechange = () => {
        console.log('Connection state:', this.pc?.connectionState);
        const connected = this.pc?.connectionState === 'connected';
        this.isConnected = connected;
        this.onConnectionChange(connected);
      };

      // Set up remote audio
      this.pc.ontrack = (e) => {
        console.log('Received remote audio track');
        this.audioEl.srcObject = e.streams[0];
      };

      // Add local audio track
      console.log('Getting user media...');
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.pc.addTrack(ms.getTracks()[0]);

      // Set up data channel
      this.dc = this.pc.createDataChannel("oai-events");
      
      this.dc.addEventListener("open", () => {
        console.log('Data channel opened');
      });
      
      this.dc.addEventListener("message", async (e) => {
        const event = JSON.parse(e.data);
        console.log("Received AI event:", event.type, event);
        
        // Handle function calls
        if (event.type === 'response.function_call_arguments.delta') {
          // Accumulate function call arguments
          if (!this.functionCallBuffer[event.call_id]) {
            this.functionCallBuffer[event.call_id] = '';
          }
          this.functionCallBuffer[event.call_id] += event.delta;
        } else if (event.type === 'response.function_call_arguments.done') {
          // Execute the function call
          if (this.onFunctionCall) {
            try {
              const args = JSON.parse(event.arguments);
              const result = await this.onFunctionCall(event.name, args);
              
              // Send function result back to AI
              if (this.dc?.readyState === 'open') {
                this.dc.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: event.call_id,
                    output: result
                  }
                }));
                this.dc.send(JSON.stringify({type: 'response.create'}));
              }
            } catch (error) {
              console.error('Error executing function call:', error);
              // Send error back to AI
              if (this.dc?.readyState === 'open') {
                this.dc.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: event.call_id,
                    output: 'Erro ao executar função: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
                  }
                }));
                this.dc.send(JSON.stringify({type: 'response.create'}));
              }
            }
            
            // Clean up buffer
            delete this.functionCallBuffer[event.call_id];
          }
        }
        
        // Pass event to onMessage handler
        this.onMessage(event);
      });

      this.dc.addEventListener("error", (e) => {
        console.error('Data channel error:', e);
      });

      // Create and set local description
      console.log('Creating offer...');
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      console.log('Connecting to OpenAI Realtime API...');
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('OpenAI SDP response error:', sdpResponse.status, errorText);
        throw new Error(`OpenAI connection failed: ${sdpResponse.status}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established with OpenAI");

      // Start recording for audio input with gender detection
      this.recorder = new AudioRecorder((audioData) => {
        // Analyze gender from first few audio samples
        if (this.genderAnalysisCount < this.GENDER_ANALYSIS_SAMPLES && audioData.length > 2048) {
          // Only analyze if audio has sufficient amplitude
          const hasVoice = audioData.some(sample => Math.abs(sample) > 0.01);
          
          if (hasVoice) {
            const analysis = this.analyzeVoiceGender(audioData);
            
            if (!this.detectedGender) {
              this.detectedGender = analysis.gender;
              this.genderConfidenceScore = analysis.confidence;
              console.log('🎭 Initial gender detected:', this.detectedGender, 'confidence:', this.genderConfidenceScore.toFixed(2));
            } else {
              // Average confidence across samples
              this.genderConfidenceScore = (this.genderConfidenceScore + analysis.confidence) / 2;
              
              // If new analysis strongly contradicts, reconsider
              if (analysis.gender !== this.detectedGender && analysis.confidence > 0.8) {
                this.detectedGender = analysis.gender;
                console.log('🎭 Gender updated to:', this.detectedGender, 'new confidence:', analysis.confidence.toFixed(2));
              }
            }
            
            this.genderAnalysisCount++;
            
            // After analyzing enough samples, notify about detected gender
            if (this.genderAnalysisCount === this.GENDER_ANALYSIS_SAMPLES && this.detectedGender) {
              console.log('🎭 Final gender decision:', this.detectedGender, 'avg confidence:', this.genderConfidenceScore.toFixed(2));
              
              // Notify about detected gender and switch to appropriate assistant
              const assistantName = this.detectedGender === 'male' ? 'Joana' : 'Marcos';
              console.log('🎭 Should be using assistant:', assistantName, 'for detected gender:', this.detectedGender);
              this.onGenderDetected?.(this.detectedGender, assistantName);
            }
          }
        }

        // Continue sending audio data
        if (this.dc?.readyState === 'open') {
          const audioBase64 = this.encodeAudioData(audioData);
          this.dc.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: audioBase64
          }));
        }
      });
      
      await this.recorder.start();
      console.log('Realtime AI Chat initialized successfully with gender detection');

    } catch (error) {
      console.error("Error initializing Realtime AI Chat:", error);
      this.onConnectionChange(false);
      throw error;
    }
  }

  private encodeAudioData(float32Array: Float32Array): string {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  }

  async sendTextMessage(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    console.log('Sending text message:', text);

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({type: 'response.create'}));
  }

  isConnectionReady(): boolean {
    return this.isConnected && this.dc?.readyState === 'open';
  }

  getDetectedGender(): { gender: 'male' | 'female' | null; assistant: string | null; confidence: number } {
    const assistant = this.detectedGender === 'male' ? 'Joana' : this.detectedGender === 'female' ? 'Marcos' : null;
    return {
      gender: this.detectedGender,
      assistant,
      confidence: this.genderConfidenceScore
    };
  }

  disconnect() {
    console.log('Disconnecting Realtime AI Chat...');
    
    this.recorder?.stop();
    this.dc?.close();
    this.pc?.close();
    
    if (this.audioEl && this.audioEl.parentNode) {
      this.audioEl.parentNode.removeChild(this.audioEl);
    }
    
    this.isConnected = false;
    this.onConnectionChange(false);
    
    // Reset gender detection state
    this.detectedGender = null;
    this.genderAnalysisCount = 0;
    this.genderConfidenceScore = 0;
    
    console.log('Realtime AI Chat disconnected');
  }
}