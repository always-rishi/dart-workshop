// scripts/registration.js
import { supabase } from './supabase-config.js';

// DOM Elements
const registrationForm = document.getElementById('registration-form');
const submitBtn = document.getElementById('submit-btn');
const submitLoader = document.getElementById('submit-loader');
const submitText = document.getElementById('submit-text');
const registrationPanel = document.getElementById('registration-panel');

// Toast Functionality
function showToast(message, type = 'error') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    toastMsg.textContent = message;

    // reset classes
    toast.className = 'toast';
    toast.classList.add(`toast-${type}`);
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// (Generate random ID logic moved to payment.js)
// Check Email Uniqueness Structure
async function isEmailRegistered(email) {
    try {
        const { data, error } = await supabase
            .from('participant')
            .select('email')
            .eq('email', email);

        if (error) throw error;

        return data.length > 0;
    } catch (error) {
        console.error("Error checking email: ", error);
        // Default to false so we don't block users if there's a config issue during dev,
        // but in prod would handle this better.
        return false;
    }
}

// Setup Form Submission Hook
registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // UI Loading State
    submitBtn.disabled = true;
    submitLoader.style.display = 'block';
    submitText.style.opacity = '0.7';

    // Get Form Data
    const formData = {
        name: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        college: document.getElementById('college').value.trim(),
        branch: document.getElementById('branch').value.trim(),
        year: document.getElementById('year').value,
        roll_number: document.getElementById('rollNumber').value.trim(),
        gender: document.getElementById('gender').value
    };

    try {
        // 1. Check if email already registered
        const alreadyRegistered = await isEmailRegistered(formData.email);

        if (alreadyRegistered) {
            showToast('Email address is already registered!', 'error');
            resetButton();
            return;
        }

        // 2. Save data to localStorage temporarily
        localStorage.setItem('dart_registration_data', JSON.stringify(formData));

        // 3. Redirect to payment page
        window.location.href = 'payment.html';

    } catch (error) {
        console.error("Error during registration pre-check: ", error);
        showToast('System validation error. Please try again.', 'error');
        resetButton();
    }
});

function resetButton() {
    submitBtn.disabled = false;
    submitLoader.style.display = 'none';
    submitText.style.opacity = '1';
}


