// scripts/payment.js
import { supabase } from './supabase-config.js';

// DOM Elements
const paymentForm = document.getElementById('payment-form');
const confirmBtn = document.getElementById('confirm-btn');
const confirmLoader = document.getElementById('confirm-loader');
const confirmText = document.getElementById('confirm-text');
const paymentPanel = document.getElementById('payment-panel');
const successPanel = document.getElementById('success-panel');
const displayParticipantId = document.getElementById('display-participant-id');
const downloadQrBtn = document.getElementById('download-qr-btn');
const qrcodeContainer = document.getElementById('qrcode-container');
const fileInput = document.getElementById('paymentProof');
const fileNameDisplay = document.getElementById('file-name-display');

// Registration Data Payload
let registrationData = null;

// Toast Functionality
function showToast(message, type = 'error') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    toastMsg.textContent = message;

    toast.className = 'toast';
    toast.classList.add(`toast-${type}`);
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Generate Random ID
function generateParticipantId() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `DART2026-${randomNum}`;
}

// Initialization Check
document.addEventListener('DOMContentLoaded', () => {
    const storedData = localStorage.getItem('dart_registration_data');
    if (!storedData) {
        // Direct access without form data -> kick back to registration
        window.location.href = 'dart-registration.html';
        return;
    }
    registrationData = JSON.parse(storedData);
});

// Update File Name Display UX
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        fileNameDisplay.textContent = "Selected: " + e.target.files[0].name;
    } else {
        fileNameDisplay.textContent = "";
    }
});

// Form Submission
paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const transactionIdInput = document.getElementById('transactionId').value.trim();
    const file = fileInput.files[0];

    // 1. Transaction Format Validation
    const pattern = /^[A-Za-z0-9-_]{8,30}$/;
    if (!pattern.test(transactionIdInput)) {
        showToast('Invalid transaction ID format. Must be 8-30 alphanumeric characters.', 'error');
        return;
    }

    if (!file) {
        showToast('Please upload a payment screenshot.', 'error');
        return;
    }

    // UI Loading State
    confirmBtn.disabled = true;
    confirmLoader.style.display = 'block';
    confirmText.style.opacity = '0.7';

    try {
        // 2. Duplicate Transaction Check
        const { data: existingTxns, error: txnError } = await supabase
            .from('participant')
            .select('transaction_id')
            .eq('transaction_id', transactionIdInput);

        if (txnError) throw txnError;

        if (existingTxns && existingTxns.length > 0) {
            showToast('This transaction ID has already been used.', 'error');
            resetButton();
            return;
        }

        // 3. Generate new ID so we can tie the file to it cleanly
        const participantID = generateParticipantId();

        // 4. Upload Payment Screenshot
        const fileExt = file.name.split('.').pop();
        const fileName = `${participantID}-receipt.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('payment_screenshots')
            .upload(fileName, file);

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            showToast('Failed to upload screenshot. Have you created the storage bucket yet?', 'error');
            resetButton();
            return;
        }

        // Retrieve public URL of the uploaded image
        const { data: publicUrlData } = supabase.storage
            .from('payment_screenshots')
            .getPublicUrl(fileName);

        const paymentProofUrl = publicUrlData.publicUrl;

        // 5. Build Final Payload and Insert
        const participantData = {
            participant_id: participantID,
            name: registrationData.name,
            email: registrationData.email,
            phone: registrationData.phone,
            college: registrationData.college,
            branch: registrationData.branch,
            year: registrationData.year,
            roll_number: registrationData.roll_number,
            gender: registrationData.gender,
            transaction_id: transactionIdInput,
            payment_proof_url: paymentProofUrl,
            attendance: false
        };

        const { error: insertError } = await supabase
            .from('participant')
            .insert([participantData]);

        if (insertError) {
            console.error("Supabase Insert Error: ", insertError);
            showToast('Failed to save registration. Please try again.', 'error');
            resetButton();
            return;
        }

        // 6. Clear localStorage and show Success
        localStorage.removeItem('dart_registration_data');
        handleSuccessState(participantID);

    } catch (error) {
        console.error("Error finalizing registration:", error);
        showToast('System error. Please try again or check console.', 'error');
        resetButton();
    }
});

function resetButton() {
    confirmBtn.disabled = false;
    confirmLoader.style.display = 'none';
    confirmText.style.opacity = '1';
}

function handleSuccessState(participantID) {
    // Hide form, Show Success
    paymentPanel.style.display = 'none';
    successPanel.style.display = 'block';

    // Set Participant ID Text
    displayParticipantId.textContent = participantID;

    // Generate QR Code
    qrcodeContainer.innerHTML = '';
    new QRCode(qrcodeContainer, {
        text: participantID,
        width: 200,
        height: 200,
        colorDark: "#0A0A0E",
        colorLight: "#FFFFFF",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Handle QR Download
downloadQrBtn.addEventListener('click', () => {
    const canvas = qrcodeContainer.querySelector('canvas');
    const image = qrcodeContainer.querySelector('img');

    let imageSrc = null;

    if (canvas) {
        imageSrc = canvas.toDataURL("image/png");
    } else if (image && image.src) {
        imageSrc = image.src;
    }

    if (imageSrc) {
        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = `DART-Workshop-QR-${displayParticipantId.textContent}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        showToast('Could not generate download. Please screenshot the QR code.', 'error');
    }
});
