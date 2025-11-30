import React, { useState, useRef, useEffect } from 'react';
import { loadModels, detectFaceAndGetDescriptor } from '../utils/faceDetection';
import { runLivenessCheck } from '../utils/livenessDetection';
import { runSimpleLivenessCheck } from '../utils/livenessDetection';



function Attendance() {
  const [status, setStatus] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAttendance, setPendingAttendance] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    loadModels()
      .then(() => {
        setModelsLoaded(true);
        setStatus('Ready to mark attendance');
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

  const markAttendance = async () => {
    if (!modelsLoaded) {
      setStatus('Models still loading, please wait...');
      return;
    }

    setIsChecking(true);
    setResult(null);
    setStatus('Starting liveness check...');

    await startCamera();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run liveness detection
    // const livenessResult = await runLivenessCheck(videoRef.current, canvasRef.current, setStatus);
    const livenessResult = await runSimpleLivenessCheck(videoRef.current, canvasRef.current, setStatus);
    
    if (!livenessResult.passed) {
      setStatus('Liveness check failed: ' + livenessResult.reason);
      stopCamera();
      setIsChecking(false);
      return;
    }

    setStatus('Liveness passed! Capturing face...');

    // Capture face descriptor
    const descriptor = await detectFaceAndGetDescriptor(videoRef.current, canvasRef.current);
    
    if (!descriptor) {
      setStatus('Failed to detect face. Please try again.');
      stopCamera();
      setIsChecking(false);
      return;
    }

    stopCamera();
    setStatus('Matching face...');

    // Send to backend for matching
    try {
      const response = await fetch(import.meta.env.VITE_API_URL+'/api/mark-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedding: Array.from(descriptor),
          livenessScore: livenessResult.score
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Show confirmation modal instead of directly marking attendance
        setPendingAttendance({
          name: data.name,
          userId: data.userId,
          confidence: data.confidence,
          distance: data.distance
        });
        setShowConfirmModal(true);
        setStatus('Please confirm user identity');
      } else {
        setResult({ success: false });
        setStatus(`Failed: ${data.error || 'No match found'}`);
      }
    } catch (err) {
      setStatus('Network error: ' + err.message);
    }

    setIsChecking(false);
  };

  const handleConfirmAttendance = () => {
    // User confirmed the identity
    setResult({
      success: true,
      ...pendingAttendance
    });
    setStatus(`✓ Attendance confirmed for ${pendingAttendance.name}!`);
    setShowConfirmModal(false);
    setPendingAttendance(null);
  };

  const handleRejectAttendance = () => {
    // User rejected the identity - reset everything for a fresh attempt
    setResult(null);
    setStatus('Attendance rejected. Ready to try again.');
    setShowConfirmModal(false);
    setPendingAttendance(null);
    setIsChecking(false);
    
    // Make sure camera is stopped
    stopCamera();
  };

  return (
    <div className="page">
      <div className="card">
        <h2>Mark Attendance</h2>
        
        <button 
          onClick={markAttendance} 
          disabled={isChecking || !modelsLoaded}
          className="btn btn-primary"
        >
          {isChecking ? 'Checking...' : 'Mark Attendance'}
        </button>

        {status && (
          <div className={`status-message ${status.startsWith('✓') ? 'success' : status.startsWith('Failed') ? 'error' : ''}`}>
            {status}
          </div>
        )}

        {result && (
          <div className={`result-card ${result.success ? 'success' : 'error'}`}>
            {result.success ? (
              <>
                <h3>✓ Attendance Marked</h3>
                <p><strong>Name:</strong> {result.name}</p>
                <p><strong>User ID:</strong> {result.userId}</p>
                <p><strong>Distance:</strong> {result.distance.toFixed(3)}</p>
                <p><strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%</p>
              </>
            ) : (
              <>
                <h3>✗ Recognition Failed</h3>
                <p>No matching user found or liveness check failed.</p>
              </>
            )}
          </div>
        )}

        <div className="video-container">
          <video ref={videoRef} autoPlay muted />
          <canvas ref={canvasRef} />
        </div>

        <div className="info-box">
          <h4>Liveness Check:</h4>
          <ul>
            <li>Follow on-screen instructions (blink or turn head)</li>
            <li>Keep your face visible and centered</li>
            <li>Ensure good lighting</li>
            <li>Don't use photos or videos</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingAttendance && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm User Identity</h3>
            <div className="modal-content">
              <p><strong>Name:</strong> {pendingAttendance.name}</p>
              <p><strong>User ID:</strong> {pendingAttendance.userId}</p>
              <p><strong>Confidence:</strong> {(pendingAttendance.confidence * 100).toFixed(1)}%</p>
              <p style={{ marginTop: '1rem', fontSize: '1rem' }}>
                Is this the correct user?
              </p>
            </div>
            <div className="modal-actions">
              <button 
                onClick={handleConfirmAttendance} 
                className="btn btn-success"
              >
                ✓ Confirm
              </button>
              <button 
                onClick={handleRejectAttendance} 
                className="btn btn-danger"
              >
                ✗ Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;