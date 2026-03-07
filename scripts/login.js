import { supabase } from './supabase-config.js';

// DOM Elements
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const loginLoader = document.getElementById('login-loader');
const loginText = document.getElementById('login-text');
const idPanel = document.getElementById('id-panel');
const qrcodeContainer = document.getElementById('qrcode-container');
const downloadQrBtn = document.getElementById('download-qr-btn');

let currentParticipant = null;

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

// Handle Login Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const rollNumber = document.getElementById('loginRoll').value.trim();

    loginBtn.disabled = true;
    loginLoader.style.display = 'block';
    loginText.style.opacity = '0.7';

    try {
        const { data, error } = await supabase
            .from('participant')
            .select('*')
            .eq('email', email)
            .eq('roll_number', rollNumber)
            .single();

        if (error || !data) {
            console.error("Login Error:", error);
            showToast('Participant not found. Please check your credentials.', 'error');
            resetBtn();
            return;
        }

        // Match found! Render the ID Card
        currentParticipant = data;
        renderIDCard(data);

        // Hide the cards and show the ID panel smoothly
        document.querySelector('.action-cards').style.display = 'none';
        document.querySelector('.hero-section').style.display = 'none';
        idPanel.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        console.error("System Error during login:", err);
        showToast('System Error. Please try again.', 'error');
        resetBtn();
    }
});

function resetBtn() {
    loginBtn.disabled = false;
    loginLoader.style.display = 'none';
    loginText.style.opacity = '1';
}

function renderIDCard(p) {
    document.getElementById('id-card-photo').src = p.student_photo_url || '';
    document.getElementById('id-card-name').textContent = p.name;
    document.getElementById('id-card-college').textContent = p.college;
    document.getElementById('id-card-roll').textContent = p.roll_number;
    document.getElementById('display-participant-id').textContent = p.participant_id;

    // Generate QR Code inside card
    qrcodeContainer.innerHTML = '';
    new QRCode(qrcodeContainer, {
        text: p.participant_id,
        width: 80,
        height: 80,
        colorDark: "#0A0A0E",
        colorLight: "#FFFFFF",
        correctLevel: QRCode.CorrectLevel.M
    });
}

// Handle Digital ID Card Download using html2canvas
downloadQrBtn.addEventListener('click', async () => {
    const originalText = downloadQrBtn.innerHTML;
    downloadQrBtn.innerHTML = "Generating Image...";
    downloadQrBtn.disabled = true;

    try {
        const idCardElement = document.getElementById('digital-id-card');

        // Use html2canvas to capture the element
        const canvas = await html2canvas(idCardElement, {
            scale: 2, // High resolution
            useCORS: true, // Allow loading cross-origin images
            backgroundColor: null
        });

        const imageSrc = canvas.toDataURL("image/png");

        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = `DART2026-ID-Card-${currentParticipant.name.replace(/\s+/g, '-')}.png`;
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
