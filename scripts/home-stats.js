import { supabase } from './supabase-config.js';

// Configuration
const TOTAL_SEATS = 100;
const SEATS_PER_TIER = 50;

document.addEventListener('DOMContentLoaded', () => {
    fetchRegistrationStats();
});

async function fetchRegistrationStats() {
    const totalSeatsElement = document.getElementById('stat-total-seats');
    const kitElement = document.getElementById('stat-kit-seats');
    const noKitElement = document.getElementById('stat-nokit-seats');

    try {
        // Fetch all participants to count their selection locally
        const { data, error } = await supabase
            .from('participant')
            .select('kit_selection');

        if (error) {
            throw error;
        }

        let withKitCount = 0;
        let withoutKitCount = 0;

        if (data) {
            data.forEach(p => {
                if (p.kit_selection === 'With Kit') {
                    withKitCount++;
                } else if (p.kit_selection === 'Without Kit') {
                    withoutKitCount++;
                }
            });
        }

        // Animate the numbers counting up
        animateValue(totalSeatsElement, 0, TOTAL_SEATS, 1000);
        
        // Custom animation function to show "Filled/50" text
        animateTierValue(kitElement, 0, withKitCount, 1000, SEATS_PER_TIER);
        animateTierValue(noKitElement, 0, withoutKitCount, 1000, SEATS_PER_TIER);

        // If seats are full, visually update them
        if (withKitCount >= SEATS_PER_TIER) {
            kitElement.style.background = 'var(--error)';
            kitElement.style.webkitBackgroundClip = 'text';
            kitElement.style.webkitTextFillColor = 'transparent';
            kitElement.nextElementSibling.style.color = 'var(--error)';
            kitElement.nextElementSibling.textContent = 'With Kit (FULL)';
        }
        
        if (withoutKitCount >= SEATS_PER_TIER) {
            noKitElement.style.background = 'var(--error)';
            noKitElement.style.webkitBackgroundClip = 'text';
            noKitElement.style.webkitTextFillColor = 'transparent';
            noKitElement.nextElementSibling.style.color = 'var(--error)';
            noKitElement.nextElementSibling.textContent = 'Without Kit (FULL)';
        }

    } catch (err) {
        console.error("Error fetching registration stats:", err);
        totalSeatsElement.textContent = TOTAL_SEATS;
        kitElement.textContent = "Error";
        noKitElement.textContent = "Error";
    }
}

// Helper function to animate numbers counting up
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // Use easeOutQuart for smooth slowing down at the end
        const easeOutProgress = 1 - Math.pow(1 - progress, 4);
        
        obj.innerHTML = Math.floor(easeOutProgress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            // Ensure exact final number
            obj.innerHTML = end;
        }
    };
    window.requestAnimationFrame(step);
}

// Custom helper to render "Filled / Total"
function animateTierValue(obj, start, end, duration, total) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        const easeOutProgress = 1 - Math.pow(1 - progress, 4);
        const currentVal = Math.floor(easeOutProgress * (end - start) + start);
        
        obj.innerHTML = `${currentVal}<span style="font-size:1.2rem; color:var(--text-secondary);">/${total}</span>`;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = `${end}<span style="font-size:1.2rem; color:rgba(255,255,255,0.4);">/${total}</span>`;
        }
    };
    window.requestAnimationFrame(step);
}
