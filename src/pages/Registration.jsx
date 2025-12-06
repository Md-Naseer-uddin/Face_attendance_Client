import React, { useState, useRef, useEffect } from 'react';
import { loadModels, detectFaceAndGetDescriptor } from '../utils/faceDetection';
import { api } from '../utils/api';

function Registration() {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const descriptorsRef = useRef([]);

  useEffect(() => {
    // Load face-api.js models on mount
    loadModels()
      .then(() => {
        setModelsLoaded(true);
        setStatus('Models loaded. Ready to register.');
      })
      .catch(err => {
        setStatus('Error loading models: ' + err.message);
      });
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setStatus('Camera access denied: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureFrames = async () => {
    if (!userId || !name) {
      setStatus('Please enter User ID and Name');
      return;
    }

    if (!modelsLoaded) {
      setStatus('Models still loading, please wait...');
      return;
    }

    setIsCapturing(true);
    setCaptureCount(0);
    descriptorsRef.current = [];
    setStatus('Starting capture...');

    await startCamera();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Let camera stabilize

    // Capture 3 frames with pauses
    for (let i = 0; i < 3; i++) {
      setStatus(`Capturing frame ${i + 1}/3... Look at the camera!`);
      setCaptureCount(i + 1);
      
      const descriptor = await detectFaceAndGetDescriptor(videoRef.current, canvasRef.current);
      
      if (!descriptor) {
        setStatus(`Failed to detect face in frame ${i + 1}. Please try again.`);
        stopCamera();
        setIsCapturing(false);
        return;
      }

      descriptorsRef.current.push(descriptor);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between captures
    }

    stopCamera();
    setStatus('Processing embeddings...');

    // Average the 3 descriptors into a single embedding
    const avgEmbedding = averageDescriptors(descriptorsRef.current);

    // Send to backend
    try {
      const response = await api.register(
        userId,
        name,
        Array.from(avgEmbedding)
      );

      const data = response.data;
      
      if (data.success) {
        setStatus(`✓ Success! Registered ${name} (${userId})`);
        // Clear form after successful registration
        setUserId('');
        setName('');
        // Save for testing purposes
        localStorage.setItem('lastEmbedding', JSON.stringify(Array.from(avgEmbedding)));
      }
    } catch (err) {
      console.error('Registration error:', err);
      
      // Handle specific error cases
      if (err.response) {
        const data = err.response.data;
        if (err.response.status === 409) {
          // Conflict - duplicate user ID or face
          if (data.error === 'User ID already taken') {
            setStatus(`❌ User ID already taken! "${userId}" is registered to ${data.existingUser}`);
          } else if (data.error === 'Face already registered') {
            setStatus(`❌ Face already registered! This face belongs to ${data.existingUser} (${data.existingUserId})`);
          } else {
            setStatus(`❌ ${data.error}`);
          }
        } else {
          setStatus(`❌ Error: ${data.error || 'Registration failed'}`);
        }
      } else {
        setStatus('❌ Network error: ' + err.message);
      }
    }

    setIsCapturing(false);
  };

  // Average multiple face descriptors into one
  const averageDescriptors = (descriptors) => {
    const dim = descriptors[0].length;
    const avg = new Float32Array(dim);
    
    for (let i = 0; i < dim; i++) {
      let sum = 0;
      for (let j = 0; j < descriptors.length; j++) {
        sum += descriptors[j][i];
      }
      avg[i] = sum / descriptors.length;
    }
    
    return avg;
  };

  return (
    <div className="page">
      <div className="card">
        <h2>Register New User</h2>
        
        <div className="form-group">
          <label>User ID:</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g., emp001"
            disabled={isCapturing}
          />
        </div>

        <div className="form-group">
          <label>Full Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., John Doe"
            disabled={isCapturing}
          />
        </div>

        <button 
          onClick={captureFrames} 
          disabled={isCapturing || !modelsLoaded}
          className="btn btn-primary"
        >
          {isCapturing ? `Capturing ${captureCount}/3...` : 'Start Registration'}
        </button>

        {status && (
          <div className={`status-message ${status.startsWith('✓') ? 'success' : status.startsWith('Error') ? 'error' : ''}`}>
            {status}
          </div>
        )}

        <div className="video-container">
          <video ref={videoRef} autoPlay muted />
          <canvas ref={canvasRef} />
        </div>

        <div className="info-box">
          <h4>Instructions:</h4>
          <ul>
            <li>Enter your User ID and Name</li>
            <li>Click "Start Registration"</li>
            <li>Look directly at the camera</li>
            <li>System will capture 3 frames automatically</li>
            <li>Keep your face centered and well-lit</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Registration;