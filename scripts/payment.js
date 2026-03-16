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
    
    // Set dynamic fee based on Kit Selection
    const dynamicFeeEl = document.getElementById('dynamic-fee');
    if (registrationData.kit_selection === 'Without Kit') {
        dynamicFeeEl.textContent = '₹500';
    } else {
        dynamicFeeEl.textContent = '₹1800';
    }
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
            kit_selection: registrationData.kit_selection,
            student_id_url: registrationData.student_id_url,     // Pass uploaded ID URL
            student_photo_url: registrationData.student_photo_url, // Pass uploaded Photo URL
            transaction_id: transactionIdInput,
            payment_proof_url: paymentProofUrl,
            attendance: false,
            verified: false
        };

        const { error: insertError } = await supabase
            .from('participant')
            .insert([participantData]);

        if (insertError) {
            console.error("Supabase Insert Error: ", insertError);
            console.error("Exact Supabase Message:", insertError.message, insertError.details);
            showToast(`Failed to save: ${insertError.message || insertError.details || 'Unknown DB Error'}`, 'error');
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

    // Populate ID Card Data
    document.getElementById('id-card-photo').src = registrationData.student_photo_url || '';
    document.getElementById('id-card-name').textContent = registrationData.name;
    document.getElementById('id-card-college').textContent = registrationData.college;
    document.getElementById('id-card-branch').textContent = registrationData.branch;
    document.getElementById('id-card-year').textContent = registrationData.year;
    document.getElementById('id-card-roll').textContent = registrationData.roll_number;
    document.getElementById('display-participant-id').textContent = participantID;

    // Generate QR Code inside card
    qrcodeContainer.innerHTML = '';

    // By default upon registration, the user is unverified
    qrcodeContainer.style.display = 'flex';
    qrcodeContainer.style.alignItems = 'center';
    qrcodeContainer.style.justifyContent = 'center';
    qrcodeContainer.style.textAlign = 'center';
    qrcodeContainer.style.width = '80px';
    qrcodeContainer.style.height = '80px';
    qrcodeContainer.style.fontSize = '0.75rem';
    qrcodeContainer.style.color = 'var(--text-secondary)';
    qrcodeContainer.innerHTML = 'Pending verification';
}

// Handle Digital ID Card Download
downloadQrBtn.addEventListener('click', async () => {
    const originalText = downloadQrBtn.innerHTML;
    downloadQrBtn.innerHTML = "Generating Image...";
    downloadQrBtn.disabled = true;

    try {
        const idCardElement = document.getElementById('digital-id-card');

        // Use html2canvas to capture the element
        const canvas = await html2canvas(idCardElement, {
            scale: 2, // High resolution
            useCORS: true, // Allow loading cross-origin images (Supabase Storage)
            backgroundColor: null // Transparent behind rounded corners
        });

        const imageSrc = canvas.toDataURL("image/png");

        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = `DART2026-ID-Card-${registrationData.name.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Error generating ID Card Image:", error);
        showToast('Failed to generate image. Please screenshot it instead.', 'error');
    } finally {
        downloadQrBtn.innerHTML = originalText;
        downloadQrBtn.disabled = false;
    }
});
