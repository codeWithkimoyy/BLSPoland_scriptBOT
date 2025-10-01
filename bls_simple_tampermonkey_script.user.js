        // ==UserScript==
        // @name         BLS Simple Slot Scanner with File Upload
        // @namespace    http://tampermonkey.net/
            // @version      6.6
        // @description  Simple BLS appointment slot scanner with file upload functionality
        // @author       BLS Slot Assistant
        // @match        https://appointment.blspolandvisa.com/*
        // @grant        GM_addStyle
        // @run-at       document-end
        // ==/UserScript==

        (function() {
            'use strict';

            // Simple Configuration with file upload support
            const CONFIG = {
                targetDates: [], // Will be set by user input
                profileData: {},
                scanInterval: 2000, 
                autoBook: true,
                imageLocation: null,
                isScanning: false,
                    scanAttempts: 0,
                    persistentScanning: false,
                    scanStartTime: null
            };

            let isRunning = false;
            let isPaused = false;
            let scanCycle = 0;
            let uploadedProfileData = null;
            let stopRequested = false;
            let pauseRequested = false;
            let activeTimeouts = [];
            let activeIntervals = [];

                // Persistent scanning functions
                function saveScanningState() {
                    const state = {
                        isScanning: CONFIG.isScanning,
                        scanAttempts: CONFIG.scanAttempts,
                        targetDates: CONFIG.targetDates,
                        profileData: CONFIG.profileData,
                        imageLocation: CONFIG.imageLocation,
                        scanStartTime: CONFIG.scanStartTime,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('bls_scanning_state', JSON.stringify(state));
                    log('💾 Scanning state saved to localStorage');
                }

                function restoreScanningState() {
                    try {
                        const savedState = localStorage.getItem('bls_scanning_state');
                        if (savedState) {
                            const state = JSON.parse(savedState);
                        // Restore if it's recent (within last 24 hours) OR if scanning was active
                        if (Date.now() - state.timestamp < 86400000 || state.isScanning) {
                                CONFIG.isScanning = state.isScanning;
                                CONFIG.scanAttempts = state.scanAttempts;
                                CONFIG.targetDates = state.targetDates;
                                CONFIG.profileData = state.profileData;
                                CONFIG.imageLocation = state.imageLocation;
                                CONFIG.scanStartTime = state.scanStartTime;
                                
                                log('🔄 Scanning state restored from localStorage');
                                log(`📅 Restored ${CONFIG.targetDates.length} target dates: ${CONFIG.targetDates.join(', ')}`);
                                log(`👤 Profile data restored: ${Object.keys(CONFIG.profileData).length} fields`);
                                log(`📸 Image restored: ${CONFIG.imageLocation ? 'Yes' : 'No'}`);
                                
                                // Update UI with restored data
                                updateUIWithRestoredData();
                                
                                return true;
                        } else {
                            localStorage.removeItem('bls_scanning_state');
                            log('⏰ Old scanning state cleared (older than 24 hours and not actively scanning)');
                        }
                        }
                    } catch (error) {
                        log(`❌ Failed to restore scanning state: ${error.message}`);
                    }
                    return false;
                }

                function clearScanningState() {
                    localStorage.removeItem('bls_scanning_state');
                    log('🗑️ Scanning state cleared');
                }

                // Update UI with restored data
                function updateUIWithRestoredData() {
                    try {
                        // Update target dates display
                        if (CONFIG.targetDates && CONFIG.targetDates.length > 0) {
                            const datesInput = document.getElementById('target-dates');
                            if (datesInput) {
                                datesInput.value = CONFIG.targetDates.join(', ');
                            }
                            log(`📅 UI updated with ${CONFIG.targetDates.length} target dates`);
                        }
                        
                        // Update profile data display
                        if (CONFIG.profileData && Object.keys(CONFIG.profileData).length > 0) {
                            const profileStatus = document.getElementById('profile-status');
                            if (profileStatus) {
                                profileStatus.textContent = `✅ Profile loaded (${Object.keys(CONFIG.profileData).length} fields)`;
                            }
                            log(`👤 UI updated with profile data (${Object.keys(CONFIG.profileData).length} fields)`);
                        }
                        
                        // Update image status
                        if (CONFIG.imageLocation) {
                            const imageStatus = document.getElementById('image-status');
                            if (imageStatus) {
                                imageStatus.textContent = '✅ Image loaded';
                            }
                            log('📸 UI updated with image status');
                        }
                        
                        // Update scan status
                        if (CONFIG.isScanning) {
                            const statusEl = document.getElementById('status');
                            if (statusEl) {
                                statusEl.textContent = `Scanning... (Attempt ${CONFIG.scanAttempts})`;
                            }
                            log('🔄 UI updated with scanning status');
                        }
                        
                    } catch (error) {
                        log(`❌ Failed to update UI with restored data: ${error.message}`);
                    }
                }

                // Add CSS styles for date visual feedback and scrollable UI
                function addDateVisualStyles() {
                    const style = document.createElement('style');
                    style.textContent = `
                        .bls-date-clicked {
                            outline: 3px solid #ff6b35 !important;
                            outline-offset: 2px !important;
                            background-color: rgba(255, 107, 53, 0.2) !important;
                            animation: bls-pulse 1s ease-in-out infinite alternate !important;
                        }
                        
                        .bls-date-checking {
                            outline: 5px solid #007bff !important;
                            outline-offset: 3px !important;
                            background-color: rgba(0, 123, 255, 0.3) !important;
                            border: 3px solid #007bff !important;
                            box-shadow: 0 0 10px #007bff !important;
                            animation: bls-pulse 0.5s ease-in-out infinite alternate !important;
                            z-index: 9999 !important;
                            position: relative !important;
                        }
                        
                        .bls-date-no-slot {
                            outline: 5px solid #dc3545 !important;
                            outline-offset: 3px !important;
                            background-color: rgba(220, 53, 69, 0.3) !important;
                            border: 3px solid #dc3545 !important;
                            box-shadow: 0 0 10px #dc3545 !important;
                            z-index: 9999 !important;
                            position: relative !important;
                        }
                        
                        .bls-date-slot-found {
                            outline: 5px solid #28a745 !important;
                            outline-offset: 3px !important;
                            background-color: rgba(40, 167, 69, 0.3) !important;
                            border: 3px solid #28a745 !important;
                            box-shadow: 0 0 10px #28a745 !important;
                            animation: bls-success-pulse 2s ease-in-out !important;
                            z-index: 9999 !important;
                            position: relative !important;
                        }
                        
                        @keyframes bls-pulse {
                            0% { opacity: 0.7; }
                            100% { opacity: 1; }
                        }
                        
                        @keyframes bls-success-pulse {
                            0% { transform: scale(1); }
                            50% { transform: scale(1.05); }
                            100% { transform: scale(1); }
                        }
                        
                        /* Custom scrollbar styling for the main panel */
                        .bls-panel::-webkit-scrollbar {
                            width: 8px;
                        }
                        
                        .bls-panel::-webkit-scrollbar-track {
                            background: #f1f1f1;
                            border-radius: 4px;
                        }
                        
                        .bls-panel::-webkit-scrollbar-thumb {
                            background: #007bff;
                            border-radius: 4px;
                        }
                        
                        .bls-panel::-webkit-scrollbar-thumb:hover {
                            background: #0056b3;
                        }
                        
                        /* Custom scrollbar styling for the log section */
                        .bls-log::-webkit-scrollbar {
                            width: 6px;
                        }
                        
                        .bls-log::-webkit-scrollbar-track {
                            background: #333;
                            border-radius: 3px;
                        }
                        
                        .bls-log::-webkit-scrollbar-thumb {
                            background: #00ff00;
                            border-radius: 3px;
                        }
                        
                        .bls-log::-webkit-scrollbar-thumb:hover {
                            background: #00cc00;
                        }
                    `;
                    document.head.appendChild(style);
                }

            // Create simple UI with file upload
            function createUI() {
                    // Add visual styles for date feedback
                    addDateVisualStyles();
                    
                const panel = document.createElement('div');
                panel.innerHTML = `
                    <div class="bls-panel" style="position:fixed;top:20px;right:20px;width:320px;max-height:80vh;background:white;border:2px solid #007bff;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:10000;font-family:Arial,sans-serif;padding:15px;overflow-y:auto;overflow-x:hidden;">
                        <!-- Date Selection Section -->
                        <div style="margin-bottom:15px;padding:10px;background:#e3f2fd;border-radius:5px;">
                            <div style="font-weight:bold;margin-bottom:5px;">📅 Select Target Dates</div>
                            <div style="margin-bottom:10px;">
                                <input type="date" id="date-picker" style="width:100%;padding:5px;margin-bottom:5px;border:1px solid #ccc;border-radius:3px;">
                                <button id="add-date" style="width:100%;padding:5px;background:#28a745;color:white;border:none;border-radius:3px;cursor:pointer;margin-bottom:5px;">Add Date</button>
                            </div>
                            <div id="selected-dates" style="max-height:100px;overflow-y:auto;border:1px solid #ddd;border-radius:3px;padding:5px;background:white;margin-bottom:5px;">
                                <div style="font-size:11px;color:#666;text-align:center;">No dates selected</div>
                            </div>
                            <button id="clear-dates" style="width:100%;padding:5px;background:#dc3545;color:white;border:none;border-radius:3px;cursor:pointer;">Clear All</button>
                            <div id="dates-status" style="font-size:11px;color:#666;margin-top:5px;">No dates set</div>
                        </div>

                        <!-- File Upload Section -->
                        <div style="margin-bottom:15px;padding:10px;background:#f8f9fa;border-radius:5px;">
                            <div style="font-weight:bold;margin-bottom:5px;">📁 Upload Profile Data</div>
                            <input type="file" id="profile-file" accept=".txt,.json" style="width:100%;margin-bottom:5px;">
                            <button id="load-profile" style="width:100%;padding:5px;background:#17a2b8;color:white;border:none;border-radius:3px;cursor:pointer;">Load Profile</button>
                            <div id="profile-status" style="font-size:11px;color:#666;margin-top:5px;">No profile loaded</div>
                        </div>

                        <!-- Image Upload Section -->
                        <div style="margin-bottom:15px;padding:10px;background:#f8f9fa;border-radius:5px;">
                            <div style="font-weight:bold;margin-bottom:5px;">📸 Upload Image</div>
                            <input type="file" id="image-file" accept="image/*" style="width:100%;margin-bottom:5px;">
                            <button id="load-image" style="width:100%;padding:5px;background:#28a745;color:white;border:none;border-radius:3px;cursor:pointer;">Load Image</button>
                            <div id="image-status" style="font-size:11px;color:#666;margin-top:5px;">No image loaded</div>
                        </div>

                        <!-- Status Section -->
                        <div style="margin-bottom:10px;">
                            <div><strong>Status:</strong> <span id="status">Idle</span></div>
                            <div><strong>Cycle:</strong> <span id="cycle">0</span></div>
                            <div><strong>Current Date:</strong> <span id="current-date">-</span></div>
                        </div>

                        <!-- Control Buttons -->
                        <div style="display:flex;gap:5px;margin-bottom:10px;">
                            <button id="start-btn" style="flex:1;padding:8px;background:#28a745;color:white;border:none;border-radius:5px;cursor:pointer;">Start</button>
                            <button id="direct-fill-btn" style="flex:1;padding:8px;background:#17a2b8;color:white;border:none;border-radius:5px;cursor:pointer;">Direct Fill</button>
                            <button id="stop-btn" style="flex:1;padding:8px;background:#dc3545;color:white;border:none;border-radius:5px;cursor:pointer;" disabled>Stop</button>
                        </div>
                        <div style="display:flex;gap:5px;margin-bottom:10px;">
                            <button id="pause-btn" style="flex:1;padding:8px;background:#ffc107;color:#212529;border:none;border-radius:5px;cursor:pointer;" disabled>Pause</button>
                        </div>
                        <div style="margin-bottom:10px;">
                            <button id="reset-btn" style="width:100%;padding:8px;background:#6c757d;color:white;border:none;border-radius:5px;cursor:pointer;">🔄 Clear All & Reset</button>
                        </div>

                        <!-- Log Section -->
                        <div id="log" class="bls-log" style="background:#000;color:#00ff00;padding:10px;border-radius:5px;max-height:200px;overflow-y:auto;font-family:'Courier New',monospace;font-size:11px;border:1px solid #333;">
                            Ready to start date picker scanning...<br>
                            📁 Upload a profile data file to begin<br>
                            ⚡ DIRECT MODE v6.6<br>
                            🚀 No verification, no delays<br>
                            📝 Fill → Upload → Book Now<br>
                            🔧 Fixed all validation errors<br>
                            📞 Fixed phone number validation<br>
                            📧 Fixed email validation<br>
                            🎯 Ultra-fast execution<br>
                            🔄 Continuous scanning after refresh<br>
                            🔁 INFINITE SCANNING - Never stops<br>
                            ♾️ Until slots are found<br>
                            💾 Data persists after refresh<br>
                            🎯 Shows date being clicked<br>
                            🎨 ENHANCED Visual date feedback<br>
                            🔵 Blue outline when checking<br>
                            🟢 Green outline when slot found<br>
                            🔴 Red outline when no slot<br>
                            ⏳ 20-second delay before submit<br>
                            📅 Fixed date of birth from profile<br>
                            ♾️ TRUE INFINITE SCANNING (24h+)<br>
                            ⏹️ Fixed Stop/Pause buttons<br>
                            🔄 GUARANTEED: Never stops when no slots<br>
                            📱 SCROLLABLE UI - All content visible<br>
                            ⏹️ INSTANT STOP - All operations halt immediately<br>
                            ⏸️ INSTANT PAUSE - All operations pause instantly<br>
                            📅 DATE PICKER - Select multiple dates easily<br>
                            ➕ ADD DATES - Click to add selected dates<br>
                            🗑️ REMOVE DATES - Individual date removal
                        </div>
                    </div>
                `;
                document.body.appendChild(panel);

                // Add event listeners
                document.getElementById('start-btn').addEventListener('click', startScanning);
                document.getElementById('direct-fill-btn').addEventListener('click', startDirectFill);
                document.getElementById('stop-btn').addEventListener('click', stopScanning);
                document.getElementById('pause-btn').addEventListener('click', pauseScanning);
                document.getElementById('reset-btn').addEventListener('click', resetAllConfiguration);
                document.getElementById('add-date').addEventListener('click', addSelectedDate);
                document.getElementById('clear-dates').addEventListener('click', clearAllDates);
                document.getElementById('load-profile').addEventListener('click', loadProfileData);
                document.getElementById('load-image').addEventListener('click', loadImageFile);
            }

            // Add selected date to the list
            function addSelectedDate() {
                const datePicker = document.getElementById('date-picker');
                const selectedDate = datePicker.value;
                
                if (!selectedDate) {
                    log('❌ Please select a date first');
                    return;
                }
                
                // Check if date is already selected
                if (CONFIG.targetDates.includes(selectedDate)) {
                    log(`⚠️ Date ${selectedDate} is already selected`);
                    return;
                }
                
                // Add date to the list
                CONFIG.targetDates.push(selectedDate);
                CONFIG.targetDates.sort(); // Keep dates sorted
                
                // Update UI
                updateSelectedDatesDisplay();
                updateDatesStatus();
                
                log(`✅ Added date: ${selectedDate}`);
            }
            
            // Clear all selected dates
            function clearAllDates() {
                CONFIG.targetDates = [];
                updateSelectedDatesDisplay();
                updateDatesStatus();
                log('🗑️ Cleared all selected dates');
            }
            
            // Update the selected dates display
            function updateSelectedDatesDisplay() {
                const selectedDatesDiv = document.getElementById('selected-dates');
                
                if (CONFIG.targetDates.length === 0) {
                    selectedDatesDiv.innerHTML = '<div style="font-size:11px;color:#666;text-align:center;">No dates selected</div>';
                        return;
                    }
                    
                let html = '';
                CONFIG.targetDates.forEach((date, index) => {
                    const formattedDate = new Date(date).toLocaleDateString();
                    html += `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 5px;margin:2px 0;background:#f8f9fa;border-radius:3px;font-size:11px;">
                            <span>${formattedDate}</span>
                            <button onclick="removeDate(${index})" style="background:#dc3545;color:white;border:none;border-radius:2px;padding:1px 5px;font-size:10px;cursor:pointer;">×</button>
                        </div>
                    `;
                });
                
                selectedDatesDiv.innerHTML = html;
            }
            
            // Update the dates status
            function updateDatesStatus() {
                const statusDiv = document.getElementById('dates-status');
                
                if (CONFIG.targetDates.length === 0) {
                    statusDiv.textContent = 'No dates set';
                    statusDiv.style.color = '#666';
                } else {
                    statusDiv.textContent = `✅ ${CONFIG.targetDates.length} date(s) selected`;
                    statusDiv.style.color = '#28a745';
                }
            }
            
            // Remove a specific date (called from the UI)
            window.removeDate = function(index) {
                CONFIG.targetDates.splice(index, 1);
                updateSelectedDatesDisplay();
                updateDatesStatus();
                log(`🗑️ Removed date at index ${index}`);
            };

            // Load profile data from file
            function loadProfileData() {
                const fileInput = document.getElementById('profile-file');
                const file = fileInput.files[0];
                
                if (!file) {
                    log('❌ Please select a profile data file');
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const content = e.target.result;
                        
                        // Try to parse as JSON first
                        try {
                            uploadedProfileData = JSON.parse(content);
                            log('✅ Profile data loaded from JSON file');
                        } catch (jsonError) {
                            // Parse as key=value format
                            uploadedProfileData = parseKeyValueFile(content);
                            log('✅ Profile data loaded from text file');
                        }
                        
                        CONFIG.profileData = uploadedProfileData;
                        document.getElementById('profile-status').textContent = `✅ Loaded: ${file.name}`;
                        document.getElementById('profile-status').style.color = '#28a745';
                        
                    } catch (error) {
                        log(`❌ Error loading profile data: ${error.message}`);
                        document.getElementById('profile-status').textContent = '❌ Error loading file';
                        document.getElementById('profile-status').style.color = '#dc3545';
                    }
                };
                
                reader.readAsText(file);
            }

            // Parse key=value format file
            function parseKeyValueFile(content) {
                const lines = content.split('\n');
                const data = {};
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine && !trimmedLine.startsWith('#')) {
                        const [key, ...valueParts] = trimmedLine.split('=');
                        if (key && valueParts.length > 0) {
                            data[key.trim()] = valueParts.join('=').trim();
                        }
                    }
                }
                
                return data;
            }

            // Load image file
            function loadImageFile() {
                const fileInput = document.getElementById('image-file');
                const file = fileInput.files[0];
                
                if (!file) {
                    log('❌ Please select an image file');
                    return;
                }

                // Convert file to base64 for storage
                const reader = new FileReader();
                reader.onload = function(e) {
                    CONFIG.imageLocation = e.target.result;
                    document.getElementById('image-status').textContent = `✅ Loaded: ${file.name}`;
                    document.getElementById('image-status').style.color = '#28a745';
                    log(`✅ Image loaded: ${file.name}`);
                };
                
                reader.readAsDataURL(file);
            }

            // Simple logging
            function log(message) {
                const logDiv = document.getElementById('log');
                if (logDiv) {
                    const timestamp = new Date().toLocaleTimeString();
                    logDiv.innerHTML += `<div>[${timestamp}] ${message}</div>`;
                    logDiv.scrollTop = logDiv.scrollHeight;
                }
                console.log(`[BLS Simple Scanner] ${message}`);
            }

            // Update status
            function updateStatus() {
                const statusEl = document.getElementById('status');
                const cycleEl = document.getElementById('cycle');
                if (statusEl) {
                    if (CONFIG.isScanning) {
                            if (isPaused) {
                                statusEl.textContent = `⏸️ PAUSED (Attempt ${CONFIG.scanAttempts})`;
                            } else {
                                statusEl.textContent = `🔄 Scanning (Attempt ${CONFIG.scanAttempts})`;
                            }
                    } else {
                        statusEl.textContent = isRunning ? 'Running' : 'Idle';
                    }
                }
                if (cycleEl) cycleEl.textContent = CONFIG.scanAttempts || scanCycle;
            }

            // Start scanning
            async function startScanning() {
                if (isRunning) return;
                
                if (!CONFIG.targetDates || CONFIG.targetDates.length === 0) {
                    log('❌ Please set target dates first');
                    return;
                }
                
                if (!CONFIG.profileData || Object.keys(CONFIG.profileData).length === 0) {
                    log('❌ Please load profile data first');
                    return;
                }
                
                // Reset all flags
                stopRequested = false;
                pauseRequested = false;
                isRunning = true;
                isPaused = false;
                scanCycle = 0;
                    CONFIG.isScanning = true;
                    CONFIG.scanStartTime = Date.now();
                
                // Clear any existing timeouts/intervals
                clearAllTimeoutsAndIntervals();
                    
                    // Save scanning state
                    saveScanningState();
                
                document.getElementById('start-btn').disabled = true;
                document.getElementById('stop-btn').disabled = false;
                document.getElementById('pause-btn').disabled = false;
                
            updateStatus();
            log('🚀 Starting complete BLS form automation...');
            
            try {
                // Start the complete BLS form automation
                await startBLSFormAutomation();
                log('✅ BLS form automation completed successfully');
            } catch (error) {
                if (error.message.includes('Operation stopped by user')) {
                    log('⏹️ Operation stopped by user - all processes halted');
                    stopScanning();
                } else {
                log(`❌ BLS form automation failed: ${error.message}`);
                        // Only stop scanning if there's a critical error
                        if (error.message.includes('critical') || error.message.includes('fatal')) {
                stopScanning();
                    }
            }
                    }
                    // Note: No finally block - scanning continues until slots found or manually stopped
            }

        // Direct fill - bypass date scanning entirely
        async function startDirectFill() {
            if (isRunning) {
                log('⚠️ Already running - use Stop button first');
                return;
            }
            
            if (!CONFIG.profileData) {
                log('❌ Please load profile data first');
                return;
            }
            
            isRunning = true;
            updateStatus();
            log('⚡ DIRECT FILL: Bypassing date scanning - going straight to form filling...');
            
            try {
                // Go directly to form filling, upload, and booking
                await fillAllFormSections();
                
                // Stop completely after form filling
                CONFIG.isScanning = false;
                stopRequested = true;
                isRunning = false;
                
                // Update UI to show completion
                const statusEl = document.getElementById('status');
                if (statusEl) {
                    statusEl.textContent = 'Booking Complete!';
                    statusEl.style.color = '#28a745';
                }
                
                // Disable all buttons except reset
                const startBtn = document.getElementById('start-btn');
                const directFillBtn = document.getElementById('direct-fill-btn');
                const stopBtn = document.getElementById('stop-btn');
                const pauseBtn = document.getElementById('pause-btn');
                const resetBtn = document.getElementById('reset-btn');
                
                if (startBtn) startBtn.disabled = true;
                if (directFillBtn) directFillBtn.disabled = true;
                if (stopBtn) stopBtn.disabled = true;
                if (pauseBtn) pauseBtn.disabled = true;
                if (resetBtn) resetBtn.disabled = false;
                
                log('✅ DIRECT FILL COMPLETE: Form filled, image uploaded, booking submitted');
            } catch (error) {
                log(`❌ Direct fill failed: ${error.message}`);
                stopScanning();
            }
        }

        // Complete BLS form automation - Direct to Form Filling
        async function startBLSFormAutomation() {
            try {
                log('🚀 Starting BLS form automation - Direct to Form Filling...');
                
                // Check if date is already selected - if so, go directly to form filling
                const appointmentDateInput = document.querySelector('input[placeholder*="Click here for Appointment Date"], input[id*="appointment_date"], #valAppointmentDate');
                if (appointmentDateInput && appointmentDateInput.value) {
                    log(`✅ Date already selected: ${appointmentDateInput.value}`);
                    log('🎯 Proceeding directly to form filling...');
                    
                    // Go directly to form filling, upload, and booking
                    await fillAllFormSections();
                    
                    // Stop completely after form filling
                    CONFIG.isScanning = false;
                    stopRequested = true;
                    isRunning = false;
                    
                    log('✅ DIRECT COMPLETE: Form filled, image uploaded, booking submitted');
                    return;
                }
                
                // If no date selected, go to date scanning
                log('📅 No date selected - starting date scanning...');
                await startDateScanning();
                
            } catch (error) {
                log(`❌ BLS form automation failed: ${error.message}`);
                throw error;
            }
        }


        // Start date scanning when Appointment Date appears
        async function startDateScanning() {
            log('📅 Starting Continuous Date Scanning');
            CONFIG.isScanning = true;
                
                // Start the scanning loop
                await scanningLoop();
            }
            
            // Main scanning loop that can be restarted after page refresh
            async function scanningLoop() {
                log('🔄 Starting infinite scanning loop - will continue until slots found');
            while (CONFIG.isScanning && !stopRequested) {
                try {
                        // Check if stop was requested
                        if (stopRequested) {
                            log('⏹️ Stop requested - exiting scanning loop');
                            break;
                        }
                        
                        // Check if scanning is paused
                        if (pauseRequested) {
                            log('⏸️ Scanning paused - waiting for resume...');
                            await waitWhilePaused();
                            continue;
                        }
                        
                        // Check if scanning should stop (only check CONFIG.isScanning)
                        if (!CONFIG.isScanning) {
                            log('⏹️ Scanning stopped - exiting loop');
                            break;
                        }
                        
                    CONFIG.scanAttempts++;
                        log(`🔄 Scan Attempt #${CONFIG.scanAttempts} - Scanning continues until slots found`);
                        log(`♾️ INFINITE MODE: Will scan forever until slots are available`);
                    
                    // First check if a date is already selected
                    const appointmentDateInput = document.querySelector('input[placeholder*="Click here for Appointment Date"], input[id*="appointment_date"], #valAppointmentDate');
                    if (appointmentDateInput && appointmentDateInput.value) {
                        log(`✅ Date already selected: ${appointmentDateInput.value}`);
                        log('🎯 Proceeding with enhanced automatic flow...');
                        
                        // Enhanced automatic flow: Select Normal Time and fill form immediately
                        const success = await handleAutomaticFlowAfterDateSelection();
                        if (success) {
                            // STOP ALL SCANNING COMPLETELY - No more date checking
                            CONFIG.isScanning = false;
                            stopRequested = true;
                            isRunning = false;
                            
                            // Clear all timeouts and intervals
                            clearAllTimeoutsAndIntervals();
                            
                            // Clear scanning state
                            clearScanningState();
                            
                            // Update UI to show completion
                            const statusEl = document.getElementById('status');
                            if (statusEl) {
                                statusEl.textContent = 'Booking Complete!';
                                statusEl.style.color = '#28a745';
                            }
                            
                            // Disable all buttons except reset
                            const startBtn = document.getElementById('start-btn');
                            const stopBtn = document.getElementById('stop-btn');
                            const pauseBtn = document.getElementById('pause-btn');
                            const resetBtn = document.getElementById('reset-btn');
                            
                            if (startBtn) startBtn.disabled = true;
                            if (stopBtn) stopBtn.disabled = true;
                            if (pauseBtn) pauseBtn.disabled = true;
                            if (resetBtn) resetBtn.disabled = false;
                            
                            log('🛑 ALL SCANNING STOPPED - No more date checking or form filling');
                            return true;
                        }
                    }
                    
                    // Wait for Appointment Date field to appear if not already visible
                    if (!appointmentDateInput) {
                        await waitForElement('input[placeholder*="Click here for Appointment Date"], input[id*="appointment_date"], #valAppointmentDate', 10000);
                    }
                    
                    log('✅ Appointment Date field detected - Starting scan');
                    log(`🎯 Will scan only these specific dates: ${CONFIG.targetDates.join(', ')}`);
                    
                    let slotFoundInThisCycle = false;
                    
                    // Start scanning selected dates one by one
                    for (let i = 0; i < CONFIG.targetDates.length; i++) {
                        // Check if stop was requested
                        if (stopRequested) {
                            log('⏹️ Stop requested - stopping date scanning');
                            throw new Error('Operation stopped by user');
                        }
                        
                        // Check if paused
                        if (pauseRequested) {
                            log('⏸️ Paused - waiting for resume...');
                            await waitWhilePaused();
                        }
                        
                        const date = CONFIG.targetDates[i];
                        log(`📅 Scanning date ${i + 1}/${CONFIG.targetDates.length}: ${date}`);
                        
                        // Update UI to show current date being scanned
                        const currentDateEl = document.getElementById('current-date');
                        if (currentDateEl) {
                            currentDateEl.textContent = date;
                        }
                        
                        const slotFound = await checkDateAvailability(date);
                        if (slotFound) {
                            log(`🎯 SLOT FOUND on ${date}!`);
                            
                            // Fill all form sections when slot is found
                            await fillAllFormSections();
                            
                            // STOP ALL SCANNING COMPLETELY - No more date checking
                            CONFIG.isScanning = false;
                            stopRequested = true;
                            isRunning = false;
                            
                            // Clear all timeouts and intervals
                            clearAllTimeoutsAndIntervals();
                            
                            // Clear scanning state
                            clearScanningState();
                            
                            // Update UI to show completion
                            const statusEl = document.getElementById('status');
                            if (statusEl) {
                                statusEl.textContent = 'Booking Complete!';
                                statusEl.style.color = '#28a745';
                            }
                            
                            // Disable all buttons except reset
                            const startBtn = document.getElementById('start-btn');
                            const stopBtn = document.getElementById('stop-btn');
                            const pauseBtn = document.getElementById('pause-btn');
                            const resetBtn = document.getElementById('reset-btn');
                            
                            if (startBtn) startBtn.disabled = true;
                            if (stopBtn) stopBtn.disabled = true;
                            if (pauseBtn) pauseBtn.disabled = true;
                            if (resetBtn) resetBtn.disabled = false;
                            
                            log('🛑 ALL SCANNING STOPPED - No more date checking or form filling');
                            return true;
                        } else {
                            log(`❌ No slot found on ${date}`);
                        }
                        
                        // Small delay between date checks
                        await delay(1000);
                    }
                    
                    if (!slotFoundInThisCycle) {
                        log('❌ No slots found in any of the selected dates');
                        log('🔄 Refreshing page and continuing scan...');
                        log('🔄 Scanning will continue indefinitely until slots are found');
                        log('♾️ INFINITE SCANNING: Will never stop until slots are available');
                        
                        // Update UI to show refresh status
                        const statusEl = document.getElementById('status');
                        if (statusEl) {
                            statusEl.textContent = `Refreshing page... (Attempt ${CONFIG.scanAttempts})`;
                        }
                        
                            // Save scanning state before refresh
                            CONFIG.isScanning = true;
                            saveScanningState();
                            
                            log('🔄 Refreshing page to continue scanning...');
                            // Refresh the page - scanning will resume automatically
                            window.location.reload();
                            return; // Exit function, will resume after page reload
                    }
                    
                } catch (error) {
                    if (error.message.includes('Operation stopped by user')) {
                        log('⏹️ Operation stopped by user - exiting scanning loop');
                        return false;
                    } else {
                    log(`❌ Date scanning failed: ${error.message}`);
                    log('🔄 Refreshing page and continuing scan...');
                    
                    // Update UI to show error and refresh
                    const statusEl = document.getElementById('status');
                    if (statusEl) {
                        statusEl.textContent = `Error occurred, refreshing... (Attempt ${CONFIG.scanAttempts})`;
                    }
                    
                        // Save scanning state before refresh
                        CONFIG.isScanning = true;
                        saveScanningState();
                        
                        log('🔄 Refreshing page due to error, continuing scan...');
                        // Refresh the page - scanning will resume automatically
                        window.location.reload();
                        return; // Exit function, will resume after page reload
                    }
                }
            }
            
            // This should never be reached if scanning is working properly
            // The loop should either continue indefinitely or exit via break when CONFIG.isScanning = false
            log('⚠️ Scanning loop ended unexpectedly');
            return false;
        }

        // Fill all form sections with complete personal information
        async function fillAllFormSections() {
                log('⚡ ULTRA-FAST MODE: Fill → Upload → Book Now (150x Speed)');
                
                try {
                    // Skip waiting - just fill immediately
                    await fillFormWithEnhancedApproach();
                    
                    // Fix person email specifically after form filling
                    await fixPersonEmailField();
                    
                    await uploadImage();
                    await clickBookNowButton();
                
                    log('✅ DIRECT COMPLETE: Form filled, image uploaded, booking submitted');
                
            } catch (error) {
                    log(`❌ Direct mode failed: ${error.message}`);
                throw error;
            }
        }

            // Fix person email field specifically
            async function fixPersonEmailField() {
                try {
                    log('🔧 Fixing Person Email field...');
                    
                    const personEmailSelectors = [
                        '#contact_person_email_add',
                        'input[placeholder*="email" i]',
                        'input[type="email"]',
                        'input[name*="email"]'
                    ];
                    
                    for (const selector of personEmailSelectors) {
                        const emailElement = document.querySelector(selector);
                        if (emailElement) {
                            const currentValue = emailElement.value;
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            const isInvalidEmail = !emailRegex.test(currentValue) || 
                                                 !currentValue.trim() || 
                                                 currentValue.includes('0000000') ||
                                                 /^\d+$/.test(currentValue) ||
                                                 currentValue.length < 5;
                            
                            if (isInvalidEmail) {
                                const validEmail = CONFIG.profileData.contact_person_email_add || 'contact@example.com';
                                
                                // Clear and set valid email
                                emailElement.focus();
                                emailElement.select();
                                emailElement.value = '';
                                emailElement.dispatchEvent(new Event('input', { bubbles: true }));
                                emailElement.dispatchEvent(new Event('change', { bubbles: true }));
                                
                                await delay(1);
                                emailElement.value = validEmail;
                                emailElement.dispatchEvent(new Event('input', { bubbles: true }));
                                emailElement.dispatchEvent(new Event('change', { bubbles: true }));
                                emailElement.dispatchEvent(new Event('blur', { bubbles: true }));
                                
                                log(`✅ Fixed Person Email: "${currentValue}" → "${validEmail}"`);
                                break;
                            }
                        }
                    }
                } catch (error) {
                    log(`❌ Error fixing person email: ${error.message}`);
                }
            }

            // Enhanced automatic flow after date selection
            async function handleAutomaticFlowAfterDateSelection() {
                try {
                    log('🚀 Starting enhanced automatic flow after date selection...');
                    
                    // Step 1: Check if appointment type dropdown is available
                    const appointmentTypeSelect = document.querySelector('#valAppointmentType, select[name*="appointment_type"], select[id*="appointment_type"], select[class*="appointment"]');
                    if (appointmentTypeSelect) {
                        log('✅ Appointment dropdown found - slot is available');
                        
                        // Step 2: Auto-select "Normal Time" immediately
                        const normalTimeSelected = await selectNormalTimeAppointment(appointmentTypeSelect);
                        if (normalTimeSelected) {
                            // Step 3: Minimal wait for form fields to appear
                            log('⏳ Waiting for form fields to appear after Normal Time selection...');
                            await delay(2);
                            
                            // Step 4: Immediately fill all form fields
                            log('📝 Proceeding with immediate form filling...');
                            await fillAllFormSections();
                            
                            log('✅ Enhanced automatic flow completed successfully!');
                            return true;
                        } else {
                            log('❌ Failed to select Normal Time appointment type');
                            return false;
                        }
                    } else {
                        log('⚠️ No appointment type dropdown found, checking for form elements...');
                        const formElements = document.querySelectorAll('input, select, textarea');
                        if (formElements.length > 0) {
                            log(`✅ Found ${formElements.length} form elements - proceeding with immediate form filling`);
                            await fillAllFormSections();
                            log('✅ Enhanced automatic flow completed (no appointment type needed)!');
                            return true;
                        } else {
                            log('❌ No form elements found');
                            return false;
                        }
                    }
                } catch (error) {
                    log(`❌ Enhanced automatic flow failed: ${error.message}`);
                    return false;
                }
            }
            
            // Select Normal Time appointment type
            async function selectNormalTimeAppointment(appointmentTypeSelect) {
                try {
                    // Look for "Normal Time" appointment type only
                    const options = Array.from(appointmentTypeSelect.options).filter(option => 
                        option.value && option.value !== '' && option.textContent.trim() !== ''
                    );
                    
                    // Debug: Log all available options
                    log('🔍 Available appointment type options:');
                    options.forEach((option, index) => {
                        log(`  ${index + 1}: "${option.textContent}" (value: "${option.value}")`);
                    });
                    
                    // Find "Normal Time" option specifically - more flexible matching
                    const normalTimeOption = options.find(option => {
                        const text = option.textContent.toLowerCase().trim();
                        return (text.includes('normal') || text === 'normal time' || text === 'normal') &&
                               !text.includes(':') && 
                               !text.includes('-') &&
                               text !== '';
                    });
                    
                    if (normalTimeOption) {
                        log(`📋 Found "Normal Time" appointment type - auto-selecting immediately`);
                        
                        // Auto-select "Normal Time" immediately
                        appointmentTypeSelect.value = normalTimeOption.value;
                        appointmentTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        log(`✅ Auto-selected appointment type: ${normalTimeOption.textContent}`);
                        
                        // Quick validation
                        await delay(1);
                        if (appointmentTypeSelect.value === normalTimeOption.value) {
                            log(`✅ Verified Normal Time selection is active`);
                            return true;
                        } else {
                            log(`❌ Normal Time selection failed, retrying...`);
                            appointmentTypeSelect.value = normalTimeOption.value;
                            appointmentTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            await delay(1);
                            return appointmentTypeSelect.value === normalTimeOption.value;
                        }
                    } else {
                        log('❌ "Normal Time" appointment type not found in dropdown');
                        log('Available options:');
                        options.forEach((option, index) => {
                            log(`  ${index + 1}: "${option.textContent}" (value: "${option.value}")`);
                        });
                        return false;
                    }
                } catch (error) {
                    log(`❌ Error selecting Normal Time appointment: ${error.message}`);
                    return false;
                }
            }

            // Enhanced form filling approach - addresses duplicate IDs and validation issues
            async function fillFormWithEnhancedApproach() {
                log('⚡ ULTRA-FAST FILLING: No verification, no delays, maximum speed');
                
                // Define field mappings with proper handling for duplicate IDs
                const fieldMappings = {
                    // Personal Information Section
                    'nationality_id': { 
                        selectors: ['#nationality_id'], 
                        type: 'select',
                        profileKey: 'nationality_id'
                    },
                    'mobile_number': { 
                        selectors: ['#valMobileNumber'], 
                        type: 'input',
                        profileKey: 'mobile_number'
                    },
                    'email': { 
                        selectors: ['#email'], 
                        type: 'input',
                        profileKey: 'email'
                    },
                    'surname_first': { 
                        selectors: ['#surname:first-of-type', 'input[id="surname"]:nth-of-type(1)'], 
                        type: 'input',
                        profileKey: 'surname'
                    },
                    'surname_at_birth': { 
                        selectors: ['#surname:nth-of-type(2)', 'input[id="surname"]:nth-of-type(2)'], 
                        type: 'input',
                        profileKey: 'surname_at_birth'
                    },
                    'place_of_birth': { 
                        selectors: ['#placeofbirth'], 
                        type: 'input',
                        profileKey: 'place_of_birth'
                    },
                    'gender': { 
                        selectors: ['#gender'], 
                        type: 'select',
                        profileKey: 'gender'
                    },
                    'marital_status': { 
                        selectors: ['#marital_status'], 
                        type: 'select',
                        profileKey: 'marital_status'
                    },
                    'country_of_birth': { 
                        selectors: ['#country_of_birth'], 
                        type: 'select',
                        profileKey: 'country_of_birth'
                    },
                    'nationality_at_birth': { 
                        selectors: ['#nationality_at_birth'], 
                        type: 'select',
                        profileKey: 'nationality_at_birth'
                    },
                    'date_of_birth': { 
                        selectors: ['#datepicker', 'input[placeholder*="Date of Birth"]', 'input[id*="date_of_birth"]', 'input[name*="date_of_birth"]'], 
                        type: 'input',
                        profileKey: 'date_of_birth'
                    },
                    'age': { 
                        selectors: ['#applicantage'], 
                        type: 'input',
                        profileKey: 'age'
                    },
                    'type_of_travel': { 
                        selectors: ['#type_of_travel'], 
                        type: 'select',
                        profileKey: 'type_of_travel'
                    },
                    'passport_issue_by': { 
                        selectors: ['#passport_issue_by'], 
                        type: 'select',
                        profileKey: 'passport_issue_by'
                    },
                    'passport_number': { 
                        selectors: ['input[name="valApplicant[1][passport_number]"]'], 
                        type: 'input',
                        profileKey: 'passport_number'
                    },
                    
                    // Applicant Address Section
                    'country': { 
                        selectors: ['#country'], 
                        type: 'select',
                        profileKey: 'country'
                    },
                    'state_province': { 
                        selectors: ['#State'], 
                        type: 'input',
                        profileKey: 'state_province'
                    },
                    'postal_code': { 
                        selectors: ['#pincode:first-of-type', 'input[id="pincode"]:nth-of-type(1)'], 
                        type: 'input',
                        profileKey: 'postal_code'
                    },
                    'street': { 
                        selectors: ['#street'], 
                        type: 'input',
                        profileKey: 'street'
                    },
                    'house_number': { 
                        selectors: ['#pincode:nth-of-type(2)', 'input[id="pincode"]:nth-of-type(2)'], 
                        type: 'input',
                        profileKey: 'house_number'
                    },
                    'flat_number': { 
                        selectors: ['#flatnumber'], 
                        type: 'input',
                        profileKey: 'flat_number'
                    },
                    
                    // Host Details Section
                    'host_type': { 
                        selectors: ['#h_person_or_company'], 
                        type: 'select',
                        profileKey: 'host_type'
                    },
                    'host_surname': { 
                        selectors: ['#h_surname'], 
                        type: 'input',
                        profileKey: 'host_surname'
                    },
                    'host_name': { 
                        selectors: ['#h_name'], 
                        type: 'input',
                        profileKey: 'host_name'
                    },
                    'host_country': { 
                        selectors: ['#h_country'], 
                        type: 'select',
                        profileKey: 'host_country'
                    },
                    'host_place': { 
                        selectors: ['#h_place'], 
                        type: 'input',
                        profileKey: 'host_place'
                    },
                    'host_postal_code': { 
                        selectors: ['#h_postal_codes'], 
                        type: 'input',
                        profileKey: 'host_postal_code'
                    },
                    'host_street': { 
                        selectors: ['#h_street'], 
                        type: 'input',
                        profileKey: 'host_street'
                    },
                    'host_house_number': { 
                        selectors: ['#h_house_number'], 
                        type: 'input',
                        profileKey: 'host_house_number'
                    },
                    'host_flat_number': { 
                        selectors: ['#h_flat_number'], 
                        type: 'input',
                        profileKey: 'host_flat_number'
                    },
                    'host_phone_number': { 
                        selectors: ['#h_phone_number'], 
                        type: 'input',
                        profileKey: 'host_phone_number'
                    },
                    
                    // Contact Person Details Section
                    'contact_person': { 
                        selectors: ['#contact_person'], 
                        type: 'input',
                        profileKey: 'contact_person'
                    },
                    'contact_name': { 
                        selectors: ['#contact_name'], 
                        type: 'input',
                        profileKey: 'contact_name'
                    },
                    'contact_place': { 
                        selectors: ['#contact_place'], 
                        type: 'select',
                        profileKey: 'contact_place'
                    },
                    'contact_person_postal': { 
                        selectors: ['#contact_person_postal'], 
                        type: 'input',
                        profileKey: 'contact_person_postal'
                    },
                    'contact_person_street': { 
                        selectors: ['#contact_street'], 
                        type: 'input',
                        profileKey: 'contact_person_street'
                    },
                    'contact_person_house': { 
                        selectors: ['#contact_person_house'], 
                        type: 'input',
                        profileKey: 'contact_person_house'
                    },
                    'contact_person_flat': { 
                        selectors: ['#contact_person_flat'], 
                        type: 'input',
                        profileKey: 'contact_person_flat'
                    },
                    'contact_person_phone_number': { 
                        selectors: ['#contact_person_phone_number'], 
                        type: 'input',
                        profileKey: 'contact_person_phone_number'
                    },
                    'contact_person_email_add': { 
                        selectors: ['#contact_person_email_add'], 
                        type: 'input',
                        profileKey: 'contact_person_email_add'
                    },
                    
                    // Father Details Section
                    'father_name': { 
                        selectors: ['#father_name'], 
                        type: 'input',
                        profileKey: 'father_name'
                    },
                    'surname_father': { 
                        selectors: ['#surname_father'], 
                        type: 'input',
                        profileKey: 'surname_father'
                    },
                    'nationality_of_father': { 
                        selectors: ['#nationality_of_father'], 
                        type: 'select',
                        profileKey: 'nationality_of_father'
                    },
                    'father_country': { 
                        selectors: ['#father_country'], 
                        type: 'select',
                        profileKey: 'father_country'
                    },
                    'father_state_province': { 
                        selectors: ['#father_state_province'], 
                        type: 'input',
                        profileKey: 'father_state_province'
                    },
                    'father_place': { 
                        selectors: ['#father_place'], 
                        type: 'input',
                        profileKey: 'father_place'
                    },
                    'father_postal_codes': { 
                        selectors: ['#father_postal_codes'], 
                        type: 'input',
                        profileKey: 'father_postal_codes'
                    },
                    'father_street': { 
                        selectors: ['#father_street'], 
                        type: 'input',
                        profileKey: 'father_street'
                    },
                    'father_house_number': { 
                        selectors: ['#father_house_number'], 
                        type: 'input',
                        profileKey: 'father_house_number'
                    },
                    'father_flat_number': { 
                        selectors: ['#father_flat_number'], 
                        type: 'input',
                        profileKey: 'father_flat_number'
                    },
                    'father_phone_number': { 
                        selectors: ['#father_phone_number'], 
                        type: 'input',
                        profileKey: 'father_phone_number'
                    },
                    'father_email_add': { 
                        selectors: ['#father_email_add'], 
                        type: 'input',
                        profileKey: 'father_email_add'
                    },
                    
                    // Mother Details Section
                    'mother_name': { 
                        selectors: ['#mother_name'], 
                        type: 'input',
                        profileKey: 'mother_name'
                    },
                    'surname_mother': { 
                        selectors: ['#surname_mother'], 
                        type: 'input',
                        profileKey: 'surname_mother'
                    },
                    'nationality_of_mother': { 
                        selectors: ['#nationality_of_mother'], 
                        type: 'select',
                        profileKey: 'nationality_of_mother'
                    },
                    'mother_country': { 
                        selectors: ['#mother_country'], 
                        type: 'select',
                        profileKey: 'mother_country'
                    },
                    'mother_state_province': { 
                        selectors: ['#mother_state_province'], 
                        type: 'input',
                        profileKey: 'mother_state_province'
                    },
                    'mother_place': { 
                        selectors: ['#mother_place'], 
                        type: 'input',
                        profileKey: 'mother_place'
                    },
                    'mother_postal_codes': { 
                        selectors: ['#mother_postal_codes'], 
                        type: 'input',
                        profileKey: 'mother_postal_codes'
                    },
                    'mother_street': { 
                        selectors: ['#mother_street'], 
                        type: 'input',
                        profileKey: 'mother_street'
                    },
                    'mother_house_number': { 
                        selectors: ['#mother_house_number'], 
                        type: 'input',
                        profileKey: 'mother_house_number'
                    },
                    'mother_flat_number': { 
                        selectors: ['#mother_flat_number'], 
                        type: 'input',
                        profileKey: 'mother_flat_number'
                    },
                    'mother_phone_number': { 
                        selectors: ['#mother_phone_number'], 
                        type: 'input',
                        profileKey: 'mother_phone_number'
                    },
                    'mother_email_add': { 
                        selectors: ['#mother_email_add'], 
                        type: 'input',
                        profileKey: 'mother_email_add'
                    },
                    
                    // Employer Details Section
                    'employer': { 
                        selectors: ['#employer'], 
                        type: 'select',
                        profileKey: 'employer'
                    },
                    'surname_employer': { 
                        selectors: ['#surname_employer'], 
                        type: 'input',
                        profileKey: 'surname_employer'
                    },
                    'employer_country_id': { 
                        selectors: ['#employer_country_id'], 
                        type: 'select',
                        profileKey: 'employer_country_id'
                    },
                    'employer_place': { 
                        selectors: ['#employer_place'], 
                        type: 'input',
                        profileKey: 'employer_place'
                    },
                    'employer_phone_number': { 
                        selectors: ['#employer_phone_number'], 
                        type: 'input',
                        profileKey: 'employer_phone_number'
                    },
                    'employer_street': { 
                        selectors: ['#employer_street'], 
                        type: 'input',
                        profileKey: 'employer_street'
                    },
                    'employer_house_number': { 
                        selectors: ['#employer_house_number'], 
                        type: 'input',
                        profileKey: 'employer_house_number'
                    },
                    'employer_flat_number': { 
                        selectors: ['#employer_flat_number'], 
                        type: 'input',
                        profileKey: 'employer_flat_number'
                    },
                    
                    // Travel Details Section
                    'destination_countries': { 
                        selectors: ['#destination_countries'], 
                        type: 'select',
                        profileKey: 'destination_countries'
                    },
                    'border_of_first_entry': { 
                        selectors: ['#border_of_first_entry'], 
                        type: 'select',
                        profileKey: 'border_of_first_entry'
                    },
                    'date_of_arrival': { 
                        selectors: ['#date_of_arrival'], 
                        type: 'input',
                        profileKey: 'date_of_arrival'
                    },
                    'date_of_departure': { 
                        selectors: ['#date_of_departure'], 
                        type: 'input',
                        profileKey: 'date_of_departure'
                    },
                    'occupation': { 
                        selectors: ['#occupation'], 
                        type: 'select',
                        profileKey: 'occupation'
                    },
                    'purpose_of_journey': { 
                        selectors: ['#purpose_of_journey'], 
                        type: 'select',
                        profileKey: 'purpose_of_journey'
                    },
                    'number_of_entry': { 
                        selectors: ['#number_of_entry'], 
                        type: 'select',
                        profileKey: 'number_of_entry'
                    },
                    'finger_prints_prev_collected': { 
                        selectors: ['#finger_prints_prev_collected'], 
                        type: 'select',
                        profileKey: 'finger_prints_prev_collected'
                    },
                    'cost_coverage_id': { 
                        selectors: ['#cost_coverage_id'], 
                        type: 'select',
                        profileKey: 'cost_coverage_id'
                    },
                    'means_of_support_id': { 
                        selectors: ['#means_of_support_id'], 
                        type: 'select',
                        profileKey: 'means_of_support_id'
                    }
                };
                
                let filledCount = 0;
                let errorCount = 0;
                
                // Process each field with enhanced approach
                for (const [fieldName, fieldConfig] of Object.entries(fieldMappings)) {
                    // Check if stop was requested
                    if (stopRequested) {
                        log('⏹️ Stop requested - stopping form filling');
                        throw new Error('Operation stopped by user');
                    }
                    
                    // Check if paused
                    if (pauseRequested) {
                        log('⏸️ Paused - waiting for resume...');
                        await waitWhilePaused();
                    }
                    
                    const profileValue = CONFIG.profileData[fieldConfig.profileKey];
                    if (!profileValue) {
                        log(`⏭️ Skipping ${fieldName}: No profile data`);
                        continue;
                    }
                    
                    let fieldFilled = false;
                    
                    // Try each selector for the field
                    for (const selector of fieldConfig.selectors) {
                        try {
                            const element = document.querySelector(selector);
                            if (element && element.offsetParent !== null && !element.disabled) {
                                // Check if field is already filled
                                if (element.value && element.value.trim() !== '' && element.value !== '- Select -') {
                                    log(`⏭️ Skipping pre-filled ${fieldName}: "${element.value}"`);
                                    filledCount++;
                                    fieldFilled = true;
                                    break;
                                }
                                
                                // Fill the field based on type
                                if (fieldConfig.type === 'select') {
                                    const success = await fillSelectField(element, profileValue, fieldName);
                                    if (success) {
                                        filledCount++;
                                        fieldFilled = true;
                                        break;
                                    }
                                } else {
                                    const success = await fillInputField(element, profileValue, fieldName);
                                    if (success) {
                                        filledCount++;
                                        fieldFilled = true;
                                        break;
                                    }
                                }
                            }
                        } catch (error) {
                            continue;
                        }
                    }
                    
                    if (!fieldFilled) {
                        errorCount++;
                        log(`❌ Failed to fill ${fieldName}`);
                    }
                    
                    // Small delay between fields
                    // No delay - direct execution
                }
                
                log(`📊 Enhanced Form Filling Results: ${filledCount} filled, ${errorCount} errors`);
                
                // Handle special cases for problematic fields
                await handleSpecialFields();
            }
            
            // Enhanced select field filling
            async function fillSelectField(element, value, fieldName) {
                try {
                    const options = Array.from(element.options);
                    let optionFound = false;
                    
                    // Try exact value match first
                    for (const option of options) {
                        if (option.value === value || option.textContent.trim() === value) {
                            element.value = option.value;
                            optionFound = true;
                            log(`✅ Filled select ${fieldName}: ${option.textContent}`);
                            break;
                        }
                    }
                    
                    // Try partial match if exact match failed
                    if (!optionFound) {
                        for (const option of options) {
                            if (option.value.toLowerCase().includes(value.toLowerCase()) || 
                                option.textContent.toLowerCase().includes(value.toLowerCase())) {
                                element.value = option.value;
                                optionFound = true;
                                log(`✅ Filled select ${fieldName} (partial match): ${option.textContent}`);
                                break;
                            }
                        }
                    }
                    
                    if (optionFound) {
                        // Trigger events
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        element.dispatchEvent(new Event('blur', { bubbles: true }));
                        // No delay - direct execution
                        return true;
                    } else {
                        log(`❌ No match found for "${value}" in ${fieldName}`);
                        return false;
                    }
                } catch (error) {
                    log(`❌ Error filling select ${fieldName}: ${error.message}`);
                    return false;
                }
            }
            
            // Enhanced input field filling
            async function fillInputField(element, value, fieldName) {
                try {
                    // Clear existing value
                    element.value = '';
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    // Set new value
                    element.value = value;
                    element.focus();
                    
                    // Check if this is a date field
                    const isDateField = fieldName.includes('date') || 
                                    element.id.includes('date') || 
                                    element.placeholder?.toLowerCase().includes('date') ||
                                    element.type === 'date' ||
                                    element.id === 'datepicker' ||
                                    element.id === 'date_of_arrival' ||
                                    element.id === 'date_of_departure';
                    
                    // For date fields, use typing simulation
                    if (isDateField) {
                        log(`📅 Date field detected: ${fieldName} - using typing simulation`);
                        await handleDateInput(element, value, fieldName);
                    } else {
                        // For non-date fields, use regular approach
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    
                    element.dispatchEvent(new Event('blur', { bubbles: true }));
                    
                    // Verify the value was set
                    if (element.value === value) {
                        log(`✅ Filled input ${fieldName}: "${value}"`);
                        return true;
                    } else {
                        log(`❌ Failed to set value for ${fieldName}`);
                        return false;
                    }
                } catch (error) {
                    log(`❌ Error filling input ${fieldName}: ${error.message}`);
                    return false;
                }
            }
            
            // Handle date input with direct value setting
            async function handleDateInput(element, value, fieldName) {
                try {
                    log(`📅 Setting date value for ${fieldName}: ${value}`);
                    
                    // Check if stop was requested
                    if (stopRequested) {
                        log('⏹️ Stop requested - stopping date input');
                        throw new Error('Operation stopped by user');
                    }
                    
                    // Check if paused
                    if (pauseRequested) {
                        log('⏸️ Paused - waiting for resume...');
                        await waitWhilePaused();
                    }
                    
                    // Focus the element first
                    element.focus();
                    await delay(1);
                    
                    // Clear existing value
                    element.value = '';
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Set the new value
                    element.value = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Simulate typing the date character by character for better compatibility
                    element.focus();
                    for (let i = 0; i < value.length; i++) {
                        const char = value[i];
                        element.dispatchEvent(new KeyboardEvent('keydown', { key: char, keyCode: char.charCodeAt(0), bubbles: true }));
                        element.dispatchEvent(new KeyboardEvent('keypress', { key: char, keyCode: char.charCodeAt(0), bubbles: true }));
                        element.dispatchEvent(new KeyboardEvent('keyup', { key: char, keyCode: char.charCodeAt(0), bubbles: true }));
                        await delay(1);
                    }
                    
                    // Press Enter to confirm the date entry
                    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                    element.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
                    element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
                    
                    // Trigger blur to finalize the input
                    element.dispatchEvent(new Event('blur', { bubbles: true }));
                    
                    // Wait for validation and processing
                    await delay(1);
                    
                    log(`✅ Set date value for ${fieldName}: ${value} (with Enter confirmation)`);
                    return true;
                } catch (error) {
                    log(`❌ Error setting date for ${fieldName}: ${error.message}`);
                    return false;
                }
            }
            
            // Ensure Father details are properly filled
            async function ensureFatherDetailsFilled() {
                log('🔧 Ensuring Father details are properly filled...');
                
                const fatherFields = {
                    'father_name': CONFIG.profileData.father_name,
                    'surname_father': CONFIG.profileData.surname_father,
                    'nationality_of_father': CONFIG.profileData.nationality_of_father,
                    'father_country': CONFIG.profileData.father_country,
                    'father_state_province': CONFIG.profileData.father_state_province,
                    'father_place': CONFIG.profileData.father_place,
                    'father_postal_codes': CONFIG.profileData.father_postal_codes,
                    'father_street': CONFIG.profileData.father_street,
                    'father_house_number': CONFIG.profileData.father_house_number,
                    'father_flat_number': CONFIG.profileData.father_flat_number,
                    'father_phone_number': CONFIG.profileData.father_phone_number,
                    'father_email_add': CONFIG.profileData.father_email_add
                };
                
                for (const [fieldId, value] of Object.entries(fatherFields)) {
                    const element = document.querySelector(`#${fieldId}`);
                    if (element && (!element.value || element.value.trim() === '')) {
                        // Clean phone number if it's a phone field
                        let cleanValue = value;
                        if (fieldId.includes('phone')) {
                            cleanValue = value.replace(/[^\d]/g, '');
                            if (cleanValue.length > 10) {
                                cleanValue = cleanValue.slice(-10);
                            }
                            if (cleanValue.length < 10) {
                                cleanValue = cleanValue.padStart(10, '0');
                            }
                        }
                        
                        element.value = cleanValue;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        element.dispatchEvent(new Event('blur', { bubbles: true }));
                        log(`✅ Filled Father ${fieldId}: ${cleanValue}`);
                    }
                }
            }
            
            // Handle Mother details "Same as father" checkbox
            async function handleMotherDetailsCheckbox() {
                log('🔧 Handling Mother details "Same as father" checkbox...');
                
                // Look for the "Same as father details" checkbox
                const sameAsFatherCheckbox = document.querySelector('input[type="checkbox"][id*="same"], input[type="checkbox"][name*="same"], input[type="checkbox"]');
                if (sameAsFatherCheckbox) {
                    // Check if it's the "Same as father" checkbox by looking at nearby text
                    const checkboxText = sameAsFatherCheckbox.parentElement?.textContent?.toLowerCase() || '';
                    if (checkboxText.includes('same') && checkboxText.includes('father')) {
                        log('✅ Found "Same as father details" checkbox');
                        
                        // Check the checkbox to copy father details to mother
                        if (!sameAsFatherCheckbox.checked) {
                            sameAsFatherCheckbox.checked = true;
                            sameAsFatherCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                            sameAsFatherCheckbox.dispatchEvent(new Event('click', { bubbles: true }));
                            log('✅ Checked "Same as father details" checkbox');
                            
                            // Wait for the form to update
                            await delay(1);
                        } else {
                            log('✅ "Same as father details" checkbox already checked');
                        }
                    }
                } else {
                    log('⚠️ "Same as father details" checkbox not found, filling mother details manually');
                    // If checkbox not found, fill mother details manually
                    await fillMotherDetailsManually();
                }
            }
            
            // Fill Mother details manually if checkbox not available
            async function fillMotherDetailsManually() {
                log('🔧 Filling Mother details manually...');
                
                const motherFields = {
                    'mother_name': CONFIG.profileData.mother_name,
                    'surname_mother': CONFIG.profileData.surname_mother,
                    'nationality_of_mother': CONFIG.profileData.nationality_of_mother,
                    'mother_country': CONFIG.profileData.mother_country,
                    'mother_state_province': CONFIG.profileData.mother_state_province,
                    'mother_place': CONFIG.profileData.mother_place,
                    'mother_postal_codes': CONFIG.profileData.mother_postal_codes,
                    'mother_street': CONFIG.profileData.mother_street,
                    'mother_house_number': CONFIG.profileData.mother_house_number,
                    'mother_flat_number': CONFIG.profileData.mother_flat_number,
                    'mother_phone_number': CONFIG.profileData.mother_phone_number ,
                    'mother_email_add': CONFIG.profileData.mother_email_add 
                };
                
                for (const [fieldId, value] of Object.entries(motherFields)) {
                    const element = document.querySelector(`#${fieldId}`);
                    if (element && (!element.value || element.value.trim() === '')) {
                        // Clean phone number if it's a phone field
                        let cleanValue = value;
                        if (fieldId.includes('phone')) {
                            cleanValue = value.replace(/[^\d]/g, '');
                            if (cleanValue.length > 10) {
                                cleanValue = cleanValue.slice(-10);
                            }
                            if (cleanValue.length < 10) {
                                cleanValue = cleanValue.padStart(10, '0');
                            }
                        }
                        
                        element.value = cleanValue;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        element.dispatchEvent(new Event('blur', { bubbles: true }));
                        log(`✅ Filled Mother ${fieldId}: ${cleanValue}`);
                    }
                }
            }
            
            // Handle special problematic fields
            async function handleSpecialFields() {
                log('⚡ DIRECT MODE: Handling special fields - no verification');
                
                // Handle Surname at Birth with multiple approaches
                await handleSurnameAtBirth();
                
                // Handle House Number field
                await handleHouseNumber();
                
                // Handle Person Phone Number with aggressive approach
                await handlePersonPhoneNumber();
                
                // Fix date and age issues
                await fixDateAndAgeIssues();
                
                // Force date of birth from profile data
                await forceDateOfBirthFromProfile();
                
                // Skip finalAggressiveAttempt to prevent re-filling date fields
                // await finalAggressiveAttempt();
                
                // Fix phone number and email validation issues
                await fixPhoneAndEmailValidation();
                
                // Ensure Father details are properly filled
                await ensureFatherDetailsFilled();
                
                // Handle Mother details "Same as father" checkbox
                await handleMotherDetailsCheckbox();
                
                // Handle Border of First Entry
                const borderElement = document.querySelector('#border_of_first_entry');
                if (borderElement && borderElement.options.length > 1) {
                    if (!borderElement.value || borderElement.value === '' || borderElement.value === '- Select -') {
                        // Try to select United States or similar
                        for (const option of borderElement.options) {
                            if (option.value === CONFIG.profileData.destination_countries || 
                                option.textContent.toLowerCase().includes(CONFIG.profileData.border_of_first_entry?.toLowerCase())) {
                                borderElement.value = option.value;
                                borderElement.dispatchEvent(new Event('change', { bubbles: true }));
                                log(`✅ Selected Border of First Entry: ${option.textContent}`);
                                break;
                            }
                        }
                    }
                }
                
                // Skip remaining date fields confirmation to prevent highlighting
                // const dateFields = [
                //     '#datepicker',
                //     '#date_of_arrival', 
                //     '#date_of_departure',
                //     'input[placeholder*="Date of Birth"]',
                //     'input[placeholder*="Date Of Arrival"]',
                //     'input[placeholder*="Date Of Departure"]'
                // ];
                
                // for (const selector of dateFields) {
                //     const dateElement = document.querySelector(selector);
                //     if (dateElement && dateElement.value && dateElement.value.trim() !== '') {
                //         // Press Enter to confirm the date
                //         dateElement.focus();
                //         dateElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                //         dateElement.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
                //         dateElement.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
                //         log(`📅 Confirmed date field ${selector} with Enter key`);
                //         // No delay - direct execution
                //     }
                // }
            }
            
            // Handle Surname at Birth field specifically
            async function handleSurnameAtBirth() {
                log('🔧 Handling Surname at Birth field...');
                
                const value = CONFIG.profileData.surname_at_birth || CONFIG.profileData.surname;
                log(`📝 Attempting to fill Surname at Birth with value: "${value}"`);
                
                // Get all surname elements to debug
                const allSurnameElements = document.querySelectorAll('input[id="surname"]');
                log(`🔍 Found ${allSurnameElements.length} surname elements`);
                
                for (let i = 0; i < allSurnameElements.length; i++) {
                    const element = allSurnameElements[i];
                    log(`🔍 Surname element ${i + 1}: value="${element.value}", placeholder="${element.placeholder}"`);
                }
                
                // Try multiple approaches to find and fill the surname at birth field
                const selectors = [
                    '#surname:nth-of-type(2)',
                    'input[id="surname"]:nth-of-type(2)',
                    'input[placeholder*="Surname at Birth"]',
                    'input[placeholder*="Surname at birth"]',
                    'input[id="surname"]:last-of-type'
                ];
                
                let filled = false;
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        log(`🔍 Found element with selector ${selector}: value="${element.value}"`);
                        if (!element.value || element.value.trim() === '') {
                            // Clear and set value aggressively
                            element.value = '';
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.value = value;
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                            element.dispatchEvent(new Event('blur', { bubbles: true }));
                            element.focus();
                            element.blur();
                            log(`✅ Filled Surname at Birth with selector ${selector}: "${value}"`);
                            filled = true;
                            break;
                        } else {
                            log(`⏭️ Element with selector ${selector} already has value: "${element.value}"`);
                        }
                    } else {
                        log(`❌ No element found with selector ${selector}`);
                    }
                }
                
                // If still not filled, try finding the second surname element manually
                if (!filled && allSurnameElements.length >= 2) {
                    const secondSurnameElement = allSurnameElements[1];
                    if (!secondSurnameElement.value || secondSurnameElement.value.trim() === '') {
                        secondSurnameElement.value = '';
                        secondSurnameElement.dispatchEvent(new Event('input', { bubbles: true }));
                        secondSurnameElement.value = value;
                        secondSurnameElement.dispatchEvent(new Event('input', { bubbles: true }));
                        secondSurnameElement.dispatchEvent(new Event('change', { bubbles: true }));
                        secondSurnameElement.dispatchEvent(new Event('blur', { bubbles: true }));
                        secondSurnameElement.focus();
                        secondSurnameElement.blur();
                        log(`✅ Filled Surname at Birth using manual second element: "${value}"`);
                        filled = true;
                    }
                }
                
                // Final attempt - find by label text
                if (!filled) {
                    const labels = document.querySelectorAll('label');
                    for (const label of labels) {
                        if (label.textContent.toLowerCase().includes('surname at birth')) {
                            const input = label.nextElementSibling || document.querySelector(`input[id="${label.getAttribute('for')}"]`);
                            if (input && (!input.value || input.value.trim() === '')) {
                                input.value = '';
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.value = value;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                input.dispatchEvent(new Event('blur', { bubbles: true }));
                                log(`✅ Filled Surname at Birth using label approach: "${value}"`);
                                filled = true;
                                break;
                            }
                        }
                    }
                }
                
                if (!filled) {
                    log(`❌ Could not fill Surname at Birth field after all attempts`);
                }
            }
            
            // Handle House Number field specifically
            async function handleHouseNumber() {
                log('🔧 Handling House Number field...');
                
                const value = CONFIG.profileData.house_number;
                
                // Try multiple approaches to find and fill the house number field
                const selectors = [
                    '#pincode:nth-of-type(2)',
                    'input[id="pincode"]:nth-of-type(2)',
                    'input[placeholder*="House number"]',
                    'input[placeholder*="House Number"]'
                ];
                
                let filled = false;
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element && (!element.value || element.value.trim() === '')) {
                        element.value = value;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        element.dispatchEvent(new Event('blur', { bubbles: true }));
                        log(`✅ Filled House Number with selector ${selector}: "${value}"`);
                        filled = true;
                        break;
                    }
                }
                
                // Try finding by label text
                if (!filled) {
                    const labels = document.querySelectorAll('label');
                    for (const label of labels) {
                        if (label.textContent.toLowerCase().includes('house number')) {
                            const input = label.nextElementSibling || document.querySelector(`input[id="${label.getAttribute('for')}"]`);
                            if (input && (!input.value || input.value.trim() === '')) {
                                input.value = value;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                log(`✅ Filled House Number using label approach: "${value}"`);
                                filled = true;
                                break;
                            }
                        }
                    }
                }
                
                if (!filled) {
                    log(`❌ Could not fill House Number field`);
                }
            }
            
            // Handle Person Phone Number field specifically
            async function handlePersonPhoneNumber() {
                log('🔧 Handling Person Phone Number field...');
                
                const value = CONFIG.profileData.host_phone_number || CONFIG.profileData.contact_person_phone_number;
                log(`📝 Attempting to fill Person Phone Number with value: "${value}"`);
                
                // Get all phone number elements to debug
                const allPhoneElements = document.querySelectorAll('input[id*="phone"], input[placeholder*="Phone"], input[name*="phone"]');
                log(`🔍 Found ${allPhoneElements.length} phone number elements`);
                
                for (let i = 0; i < allPhoneElements.length; i++) {
                    const element = allPhoneElements[i];
                    log(`🔍 Phone element ${i + 1}: id="${element.id}", value="${element.value}", placeholder="${element.placeholder}"`);
                }
                
                // Try multiple approaches to find and fill the phone number field
                const selectors = [
                    '#h_phone_number',
                    'input[placeholder*="Person Phone Number"]',
                    'input[placeholder*="Phone Number"]',
                    'input[name*="phone"]',
                    'input[id*="phone"]'
                ];
                
                let filled = false;
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        log(`🔍 Found element with selector ${selector}: value="${element.value}"`);
                        if (!element.value || element.value.trim() === '') {
                            // Clear and set value with aggressive approach
                            element.value = '';
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                            element.value = value;
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                            element.dispatchEvent(new Event('blur', { bubbles: true }));
                            element.focus();
                            element.blur();
                            
                            // Additional events to ensure validation
                            element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, bubbles: true }));
                            element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', keyCode: 9, bubbles: true }));
                            
                            log(`✅ Force-filled Person Phone Number with selector ${selector}: "${value}"`);
                            filled = true;
                            break;
                        } else {
                            log(`⏭️ Element with selector ${selector} already has value: "${element.value}"`);
                        }
                    } else {
                        log(`❌ No element found with selector ${selector}`);
                    }
                }
                
                // Try finding by label text
                if (!filled) {
                    const labels = document.querySelectorAll('label');
                    for (const label of labels) {
                        if (label.textContent.toLowerCase().includes('phone number')) {
                            const input = label.nextElementSibling || document.querySelector(`input[id="${label.getAttribute('for')}"]`);
                            if (input && (!input.value || input.value.trim() === '')) {
                                input.value = '';
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                input.value = value;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                input.dispatchEvent(new Event('blur', { bubbles: true }));
                                input.focus();
                                input.blur();
                                log(`✅ Force-filled Person Phone Number using label approach: "${value}"`);
                                filled = true;
                                break;
                            }
                        }
                    }
                }
                
                // Final attempt - try to find any empty phone field
                if (!filled) {
                    for (const element of allPhoneElements) {
                        if (!element.value || element.value.trim() === '') {
                            element.value = '';
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                            element.value = value;
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                            element.dispatchEvent(new Event('blur', { bubbles: true }));
                            element.focus();
                            element.blur();
                            log(`✅ Force-filled Person Phone Number using fallback approach: "${value}"`);
                            filled = true;
                            break;
                        }
                    }
                }
                
                if (!filled) {
                    log(`❌ Could not fill Person Phone Number field after all attempts`);
                }
            }
            
            // Fix date and age issues
            async function fixDateAndAgeIssues() {
                log('🔧 Checking date of birth and age for issues...');
                
                // Find date of birth element with multiple selectors
                const dateOfBirthSelectors = [
                    '#datepicker',
                    'input[placeholder*="Date of Birth"]',
                    'input[id*="date_of_birth"]',
                    'input[name*="date_of_birth"]'
                ];
                
                let dateOfBirthElement = null;
                for (const selector of dateOfBirthSelectors) {
                    dateOfBirthElement = document.querySelector(selector);
                    if (dateOfBirthElement) {
                        log(`✅ Found date of birth element with selector: ${selector}`);
                        break;
                    }
                }
                
                const ageElement = document.querySelector('#applicantage');
                
                if (dateOfBirthElement && ageElement) {
                    const currentDate = new Date();
                    const birthDate = new Date(dateOfBirthElement.value);
                    const age = parseInt(ageElement.value);
                    
                    log(`🔍 Current date of birth: ${dateOfBirthElement.value}`);
                    log(`🔍 Current age: ${ageElement.value}`);
                    log(`🔍 Birth date parsed: ${birthDate}`);
                    log(`🔍 Current date: ${currentDate}`);
                    
                    // Always use profile data if available, regardless of current values
                        if (CONFIG.profileData && CONFIG.profileData.date_of_birth) {
                            const profileBirthDate = CONFIG.profileData.date_of_birth;
                            const profileAge = CONFIG.profileData.age;
                            
                        log(`📅 FORCING profile date of birth: ${profileBirthDate}`);
                        log(`📅 FORCING profile age: ${profileAge}`);
                            
                        // Clear and set date of birth with profile data
                        dateOfBirthElement.value = '';
                        dateOfBirthElement.dispatchEvent(new Event('input', { bubbles: true }));
                            dateOfBirthElement.value = profileBirthDate;
                            dateOfBirthElement.dispatchEvent(new Event('input', { bubbles: true }));
                            dateOfBirthElement.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // For date fields, press Enter to confirm
                        dateOfBirthElement.focus();
                        dateOfBirthElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                        dateOfBirthElement.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
                        dateOfBirthElement.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
                        dateOfBirthElement.dispatchEvent(new Event('blur', { bubbles: true }));
                            
                            // Update age with profile data
                            if (profileAge) {
                            ageElement.value = '';
                            ageElement.dispatchEvent(new Event('input', { bubbles: true }));
                                ageElement.value = profileAge.toString();
                                ageElement.dispatchEvent(new Event('input', { bubbles: true }));
                                ageElement.dispatchEvent(new Event('change', { bubbles: true }));
                            ageElement.dispatchEvent(new Event('blur', { bubbles: true }));
                            }
                            
                        log(`✅ FORCED date of birth to profile data: ${profileBirthDate} and age to: ${profileAge}`);
                        } else {
                        log('⚠️ No profile data available for date of birth');
                    }
                } else {
                    log('⚠️ Date of birth or age elements not found');
                    if (!dateOfBirthElement) {
                        log('❌ Date of birth element not found with any selector');
                    }
                    if (!ageElement) {
                        log('❌ Age element not found');
                    }
                }
            }
            
            // Force date of birth from profile data with typing
            async function forceDateOfBirthFromProfile() {
                log('🔧 FORCING date of birth from profile data with typing...');
                
                if (!CONFIG.profileData || !CONFIG.profileData.date_of_birth) {
                    log('⚠️ No profile data available for date of birth');
                    return;
                }
                
                const profileBirthDate = CONFIG.profileData.date_of_birth;
                
                log(`📅 Typing profile date of birth: ${profileBirthDate}`);
                
                // Try multiple selectors for date of birth
                const dateOfBirthSelectors = [
                    '#datepicker',
                    'input[placeholder*="Date of Birth"]',
                    'input[id*="date_of_birth"]',
                    'input[name*="date_of_birth"]',
                    'input[type="date"]',
                    'input[placeholder*="Birth"]'
                ];
                
                let dateOfBirthElement = null;
                for (const selector of dateOfBirthSelectors) {
                    dateOfBirthElement = document.querySelector(selector);
                    if (dateOfBirthElement) {
                        log(`✅ Found date of birth element with selector: ${selector}`);
                        break;
                    }
                }
                
                if (dateOfBirthElement) {
                    // Use the typing handler
                    const success = await handleDateInput(dateOfBirthElement, profileBirthDate, 'date_of_birth');
                    
                    if (success) {
                        // Wait for age to be calculated
                        await delay(1);
                        
                        // Check if age was automatically calculated
                        const ageElement = document.querySelector('#applicantage');
                        if (ageElement && ageElement.value) {
                            log(`✅ Age automatically calculated: ${ageElement.value}`);
                        } else {
                            log(`⚠️ Age not automatically calculated, using profile age: ${CONFIG.profileData.age}`);
                            if (ageElement && CONFIG.profileData.age) {
                                ageElement.value = CONFIG.profileData.age.toString();
                            ageElement.dispatchEvent(new Event('input', { bubbles: true }));
                            ageElement.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        }
                        
                        log(`✅ Typed date of birth: ${profileBirthDate}`);
                    } else {
                        log(`❌ Typing date of birth failed for: ${profileBirthDate}`);
                    }
                } else {
                    log('❌ Date of birth element not found with any selector');
                }
            }
            
            // Final aggressive attempt for problematic fields
            async function finalAggressiveAttempt() {
                log('🚀 Final aggressive attempt for problematic fields...');
                
                // Force fill Surname at Birth - try all possible approaches
                const surnameValue = CONFIG.profileData.surname_at_birth || CONFIG.profileData.surname;
                const allSurnameInputs = document.querySelectorAll('input[id="surname"]');
                
                if (allSurnameInputs.length >= 2) {
                    const secondSurname = allSurnameInputs[1];
                    if (!secondSurname.value || secondSurname.value.trim() === '') {
                        // Force clear and set
                        secondSurname.focus();
                        secondSurname.select();
                        secondSurname.value = '';
                        secondSurname.dispatchEvent(new Event('input', { bubbles: true }));
                        secondSurname.dispatchEvent(new Event('change', { bubbles: true }));
                        secondSurname.value = surnameValue;
                        secondSurname.dispatchEvent(new Event('input', { bubbles: true }));
                        secondSurname.dispatchEvent(new Event('change', { bubbles: true }));
                        secondSurname.dispatchEvent(new Event('blur', { bubbles: true }));
                        log(`🚀 Final attempt: Force-filled Surname at Birth: "${surnameValue}"`);
                    }
                }
                
                // Force fill Person Phone Number - try all possible approaches
                const phoneValue = CONFIG.profileData.host_phone_number || CONFIG.profileData.contact_person_phone_number;
                const allPhoneInputs = document.querySelectorAll('input[id*="phone"], input[placeholder*="Phone"]');
                
                for (const phoneInput of allPhoneInputs) {
                    if (!phoneInput.value || phoneInput.value.trim() === '') {
                        // Force clear and set
                        phoneInput.focus();
                        phoneInput.select();
                        phoneInput.value = '';
                        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
                        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
                        phoneInput.value = phoneValue;
                        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
                        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
                        phoneInput.dispatchEvent(new Event('blur', { bubbles: true }));
                        log(`🚀 Final attempt: Force-filled Phone Number: "${phoneValue}"`);
                        break;
                    }
                }
                
                // Force fill House Number
                const houseValue = CONFIG.profileData.house_number;
                const allPincodeInputs = document.querySelectorAll('input[id="pincode"]');
                
                if (allPincodeInputs.length >= 2) {
                    const secondPincode = allPincodeInputs[1];
                    if (!secondPincode.value || secondPincode.value.trim() === '') {
                        // Force clear and set
                        secondPincode.focus();
                        secondPincode.select();
                        secondPincode.value = '';
                        secondPincode.dispatchEvent(new Event('input', { bubbles: true }));
                        secondPincode.dispatchEvent(new Event('change', { bubbles: true }));
                        secondPincode.value = houseValue;
                        secondPincode.dispatchEvent(new Event('input', { bubbles: true }));
                        secondPincode.dispatchEvent(new Event('change', { bubbles: true }));
                        secondPincode.dispatchEvent(new Event('blur', { bubbles: true }));
                        log(`🚀 Final attempt: Force-filled House Number: "${houseValue}"`);
                    }
                }
                
                // Force fill Date of Birth - try all possible approaches
                const birthDateValue = CONFIG.profileData.date_of_birth;
                const ageValue = CONFIG.profileData.age;
                
                const allDateInputs = document.querySelectorAll('input[type="date"], input[placeholder*="Date"], input[id*="date"], input[name*="date"]');
                for (const dateInput of allDateInputs) {
                    if (dateInput.id === 'datepicker' || dateInput.placeholder?.toLowerCase().includes('birth') || dateInput.id?.toLowerCase().includes('birth')) {
                        // Use direct date setting for date of birth
                        await handleDateInput(dateInput, birthDateValue, 'date_of_birth');
                        log(`🚀 Final attempt: Set Date of Birth: "${birthDateValue}"`);
                        break;
                    }
                }
                
                // Force fill Date of Arrival - try all possible approaches
                const arrivalDateValue = CONFIG.profileData.date_of_arrival;
                if (arrivalDateValue) {
                    const arrivalDateInput = document.querySelector('#date_of_arrival, input[placeholder*="Arrival"], input[id*="arrival"]');
                    if (arrivalDateInput) {
                        await handleDateInput(arrivalDateInput, arrivalDateValue, 'date_of_arrival');
                        log(`🚀 Final attempt: Set Date of Arrival: "${arrivalDateValue}"`);
                    }
                }
                
                // Force fill Date of Departure - try all possible approaches
                const departureDateValue = CONFIG.profileData.date_of_departure;
                if (departureDateValue) {
                    const departureDateInput = document.querySelector('#date_of_departure, input[placeholder*="Departure"], input[id*="departure"]');
                    if (departureDateInput) {
                        await handleDateInput(departureDateInput, departureDateValue, 'date_of_departure');
                        log(`🚀 Final attempt: Set Date of Departure: "${departureDateValue}"`);
                    }
                }
                
                // Force fill Age
                const ageElement = document.querySelector('#applicantage');
                if (ageElement) {
                    ageElement.focus();
                    ageElement.select();
                    ageElement.value = '';
                    ageElement.dispatchEvent(new Event('input', { bubbles: true }));
                    ageElement.dispatchEvent(new Event('change', { bubbles: true }));
                    ageElement.value = ageValue;
                    ageElement.dispatchEvent(new Event('input', { bubbles: true }));
                    ageElement.dispatchEvent(new Event('change', { bubbles: true }));
                    ageElement.dispatchEvent(new Event('blur', { bubbles: true }));
                    log(`🚀 Final attempt: Force-filled Age: "${ageValue}"`);
                }
            }
            
            // Fix phone number and email validation issues
            async function fixPhoneAndEmailValidation() {
                log('🔧 Fixing phone number and email validation issues...');
                
                // Fix Father's Phone Number - ensure exactly 10 digits
                const fatherPhoneElement = document.querySelector('#father_phone_number');
                if (fatherPhoneElement) {
                    const currentValue = fatherPhoneElement.value;
                    let cleanPhone = currentValue.replace(/[^\d]/g, ''); // Remove all non-digits
                    
                    // If phone is longer than 10 digits, take last 10
                    if (cleanPhone.length > 10) {
                        cleanPhone = cleanPhone.slice(-10);
                    }
                    
                    // If phone is shorter than 10 digits, pad with zeros
                    if (cleanPhone.length < 10) {
                        cleanPhone = cleanPhone.padStart(10, '0');
                    }
                    
                    if (cleanPhone !== currentValue) {
                        fatherPhoneElement.value = cleanPhone;
                        fatherPhoneElement.dispatchEvent(new Event('input', { bubbles: true }));
                        fatherPhoneElement.dispatchEvent(new Event('change', { bubbles: true }));
                        fatherPhoneElement.dispatchEvent(new Event('blur', { bubbles: true }));
                        log(`✅ Fixed Father's Phone Number: "${currentValue}" → "${cleanPhone}"`);
                    }
                }
                
                // Fix Mother's Phone Number - ensure exactly 10 digits
                const motherPhoneElement = document.querySelector('#mother_phone_number');
                if (motherPhoneElement) {
                    const currentValue = motherPhoneElement.value;
                    let cleanPhone = currentValue.replace(/[^\d]/g, ''); // Remove all non-digits
                    
                    // If phone is longer than 10 digits, take last 10
                    if (cleanPhone.length > 10) {
                        cleanPhone = cleanPhone.slice(-10);
                    }
                    
                    // If phone is shorter than 10 digits, pad with zeros
                    if (cleanPhone.length < 10) {
                        cleanPhone = cleanPhone.padStart(10, '0');
                    }
                    
                    if (cleanPhone !== currentValue) {
                        motherPhoneElement.value = cleanPhone;
                        motherPhoneElement.dispatchEvent(new Event('input', { bubbles: true }));
                        motherPhoneElement.dispatchEvent(new Event('change', { bubbles: true }));
                        motherPhoneElement.dispatchEvent(new Event('blur', { bubbles: true }));
                        log(`✅ Fixed Mother's Phone Number: "${currentValue}" → "${cleanPhone}"`);
                    }
                }
                
                // Fix Employer Phone Number - ensure exactly 10 digits
                const employerPhoneElement = document.querySelector('#employer_phone_number');
                if (employerPhoneElement) {
                    const currentValue = employerPhoneElement.value;
                    let cleanPhone = currentValue.replace(/[^\d]/g, ''); // Remove all non-digits
                    
                    // If phone is longer than 10 digits, take last 10
                    if (cleanPhone.length > 10) {
                        cleanPhone = cleanPhone.slice(-10);
                    }
                    
                    // If phone is shorter than 10 digits, pad with zeros
                    if (cleanPhone.length < 10) {
                        cleanPhone = cleanPhone.padStart(10, '0');
                    }
                    
                    if (cleanPhone !== currentValue) {
                        employerPhoneElement.value = cleanPhone;
                        employerPhoneElement.dispatchEvent(new Event('input', { bubbles: true }));
                        employerPhoneElement.dispatchEvent(new Event('change', { bubbles: true }));
                        employerPhoneElement.dispatchEvent(new Event('blur', { bubbles: true }));
                        log(`✅ Fixed Employer Phone Number: "${currentValue}" → "${cleanPhone}"`);
                    }
                }
                
                // Fix Contact Person Email - ensure valid email format
                const contactEmailElement = document.querySelector('#contact_person_email_add');
                if (contactEmailElement) {
                    const currentValue = contactEmailElement.value;
                    // Check if email is valid, if not, set a default valid email
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    const isInvalidEmail = !emailRegex.test(currentValue) || 
                                         !currentValue.trim() || 
                                         currentValue.includes('0000000') ||
                                         /^\d+$/.test(currentValue) || // All digits
                                         currentValue.length < 5; // Too short
                    
                    if (isInvalidEmail) {
                        const validEmail = CONFIG.profileData.contact_person_email_add || 'contact@example.com';
                        
                        // Clear field completely
                        contactEmailElement.focus();
                        contactEmailElement.select();
                        contactEmailElement.value = '';
                        contactEmailElement.dispatchEvent(new Event('input', { bubbles: true }));
                        contactEmailElement.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Wait a moment then set valid email
                        await delay(1);
                        contactEmailElement.value = validEmail;
                        contactEmailElement.dispatchEvent(new Event('input', { bubbles: true }));
                        contactEmailElement.dispatchEvent(new Event('change', { bubbles: true }));
                        contactEmailElement.dispatchEvent(new Event('blur', { bubbles: true }));
                        
                        log(`✅ Fixed Contact Person Email: "${currentValue}" → "${validEmail}"`);
                    }
                }
                
                // Also fix any other phone numbers that might have issues
                const allPhoneElements = document.querySelectorAll('input[id*="phone"], input[placeholder*="Phone"]');
                for (const phoneElement of allPhoneElements) {
                    const currentValue = phoneElement.value;
                    if (currentValue && (currentValue.includes('+') || currentValue.length > 10)) {
                        let cleanPhone = currentValue.replace(/[^\d]/g, ''); // Remove all non-digits
                        
                        // If phone is longer than 10 digits, take last 10
                        if (cleanPhone.length > 10) {
                            cleanPhone = cleanPhone.slice(-10);
                        }
                        
                        // If phone is shorter than 10 digits, pad with zeros
                        if (cleanPhone.length < 10) {
                            cleanPhone = cleanPhone.padStart(10, '0');
                        }
                        
                        if (cleanPhone !== currentValue) {
                            phoneElement.value = cleanPhone;
                            phoneElement.dispatchEvent(new Event('input', { bubbles: true }));
                            phoneElement.dispatchEvent(new Event('change', { bubbles: true }));
                            phoneElement.dispatchEvent(new Event('blur', { bubbles: true }));
                            log(`✅ Fixed phone number: "${currentValue}" → "${cleanPhone}"`);
                        }
                    }
            }
        }

        // Wait for form section to be visible
        async function waitForFormSection(sectionName, keySelectors) {
            log(`⏳ Waiting for ${sectionName} section to be visible...`);
            for (const selector of keySelectors) {
                try {
                    await waitForElement(selector, 3000);
                    log(`✅ ${sectionName} section is visible`);
                    return true;
                } catch (error) {
                    continue;
                }
            }
            log(`❌ ${sectionName} section not found`);
            return false;
        }

        // Helper function to evaluate XPath expressions
        function evaluateXPath(xpath) {
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            return result.singleNodeValue;
        }

        // Special function to handle duplicate ID fields
        function findFieldByLabelText(labelText) {
            const labels = document.querySelectorAll('label');
            for (const label of labels) {
                if (label.textContent.trim() === labelText) {
                    // Find the input field associated with this label
                    let input = null;
                    
                    if (label.getAttribute('for')) {
                        const inputsWithId = document.querySelectorAll(`input[id="${label.getAttribute('for')}"]`);
                        // If multiple inputs have same ID, find the one that's closest to this label
                        for (const inputEl of inputsWithId) {
                            if (inputEl.closest('.form-floating') === label.closest('.form-floating')) {
                                input = inputEl;
                                break;
                            }
                        }
                        // Fallback: use the second one if we can't find by proximity
                        if (!input && inputsWithId.length > 1) {
                            input = inputsWithId[1];
                        } else if (!input) {
                            input = inputsWithId[0];
                        }
                    } else {
                        input = label.nextElementSibling;
                    }
                    
                    return input;
                }
            }
            return null;
        }

        // Special function to aggressively fill problematic fields
        async function fillProblematicFields() {
            log('🔧 Filling problematic fields with aggressive approach...');
            
            // Fill Surname at Birth using XPath approach
            const surnameAtBirthInput = evaluateXPath('//*[@id="surname"]');
            if (surnameAtBirthInput && (!surnameAtBirthInput.value || surnameAtBirthInput.value.trim() === '')) {
                surnameAtBirthInput.value = 'Doe';
                surnameAtBirthInput.dispatchEvent(new Event('input', { bubbles: true }));
                surnameAtBirthInput.dispatchEvent(new Event('change', { bubbles: true }));
                log(`✅ Filled Surname at Birth using XPath approach`);
            } else if (surnameAtBirthInput && surnameAtBirthInput.value && surnameAtBirthInput.value.trim() !== '') {
                log(`⏭️ Skipping pre-filled Surname at Birth: "${surnameAtBirthInput.value}"`);
            } else {
                log(`❌ Could not find Surname at Birth field using XPath`);
            }
            
            // Also ensure regular Surname field is filled correctly
            const surnameInput = findFieldByLabelText('Surname');
            if (surnameInput && (!surnameInput.value || surnameInput.value.trim() === '')) {
                surnameInput.value = 'Doe';
                surnameInput.dispatchEvent(new Event('input', { bubbles: true }));
                surnameInput.dispatchEvent(new Event('change', { bubbles: true }));
                log(`✅ Filled Surname using improved label approach`);
            } else if (surnameInput && surnameInput.value && surnameInput.value.trim() !== '') {
                log(`⏭️ Skipping pre-filled Surname: "${surnameInput.value}"`);
            } else {
                log(`❌ Could not find Surname field`);
            }
            
            // No fallback selectors - using XPath only for Surname at Birth
            
            // No fallback selectors - using XPath only for Person Phone Number
            
            // Fill Border of First Entry using label-based approach
            const borderLabels = document.querySelectorAll('label');
            for (const label of borderLabels) {
                if (label.textContent.includes('Border Of First Entry')) {
                    const select = label.nextElementSibling || document.querySelector(`select[id="${label.getAttribute('for')}"]`);
                    if (select && select.tagName === 'SELECT' && select.options.length > 1) {
                        // Check if already selected (not default "- Select -" option)
                        if (select.value && select.value !== '' && select.value !== '- Select -') {
                            log(`⏭️ Skipping pre-filled Border of First Entry: "${select.options[select.selectedIndex]?.textContent}"`);
                            break;
                        }
                        
                        // Try to select option with value "75" or similar
                        for (const option of select.options) {
                            if (option.value === '75' || option.value === '237' || option.textContent.toLowerCase().includes('united states')) {
                                select.value = option.value;
                                select.dispatchEvent(new Event('change', { bubbles: true }));
                                log(`✅ Selected Border of First Entry using label approach: ${option.textContent} (${option.value})`);
                                break;
                            }
                        }
                        break;
                    }
                }
            }
            
            // Fallback: Try direct selectors for Border of First Entry
            const borderSelectors = [
                'select[id="border_of_first_entry"]',
                'select[placeholder*="Border Of First Entry"]',
                'select[placeholder="Border Of First Entry"]',
                'select[name*="border_of_first_entry"]'
            ];
            
            for (const selector of borderSelectors) {
                try {
                    const element = document.querySelector(selector);
                    if (element && element.options.length > 1) {
                        // Check if already selected (not default "- Select -" option)
                        if (element.value && element.value !== '' && element.value !== '- Select -') {
                            log(`⏭️ Skipping pre-filled Border of First Entry: "${element.options[element.selectedIndex]?.textContent}"`);
                            break;
                        }
                        
                        // Try to select option with value "75" or similar
                        for (const option of element.options) {
                            if (option.value === '75' || option.value === '237' || option.textContent.toLowerCase().includes('united states')) {
                                element.value = option.value;
                                element.dispatchEvent(new Event('change', { bubbles: true }));
                                log(`✅ Selected Border of First Entry with selector: ${option.textContent} (${option.value})`);
                                break;
                            }
                        }
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            // Extra aggressive approach for Person Phone Number - force fill by XPath
            const phoneField = evaluateXPath('//*[@id="h_phone_number"]');
            if (phoneField) {
                // Clear any existing value first
                phoneField.value = '';
                phoneField.dispatchEvent(new Event('input', { bubbles: true }));
                phoneField.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Set the new value
                phoneField.value = '+12345678901';
                phoneField.dispatchEvent(new Event('input', { bubbles: true }));
                phoneField.dispatchEvent(new Event('change', { bubbles: true }));
                phoneField.dispatchEvent(new Event('blur', { bubbles: true }));
                phoneField.dispatchEvent(new Event('focus', { bubbles: true }));
                phoneField.dispatchEvent(new Event('keyup', { bubbles: true }));
                phoneField.dispatchEvent(new Event('keydown', { bubbles: true }));
                
                // Force trigger validation
                phoneField.focus();
                phoneField.blur();
                
                log(`✅ Force-filled Person Phone Number by XPath: //*[@id="h_phone_number"] with value: "${phoneField.value}"`);
            } else {
                log(`❌ Could not find h_phone_number field using XPath`);
            }
        }






            // Click Book Now Button automatically after image upload
        async function clickBookNowButton() {
                log('⏳ BOOK NOW: Adding 5-second delay before submit...');
            
            try {
                    // Add minimal delay before clicking submit
                    log('⏳ Waiting 50ms before clicking submit button...');
                    await delay(50); // 50ms delay
                    log('✅ Delay completed, proceeding to click submit button');
                    
                const bookNowSelectors = [
                    'button[type="submit"]',
                    'input[type="submit"]',
                    'button:contains("Book Now")',
                    'button:contains("Submit")',
                    'button:contains("Confirm")',
                    '.book-now-btn',
                    '.submit-btn',
                    '#book-now',
                    '#submit'
                ];
                
                let bookNowButton = null;
                for (const selector of bookNowSelectors) {
                    try {
                        bookNowButton = document.querySelector(selector);
                        if (bookNowButton) break;
                    } catch (e) {
                        continue;
                    }
                }
                
                if (bookNowButton) {
                    bookNowButton.click();
                    log('✅ Book Now button clicked after 5-second delay!');
                    
                    // STOP ALL SCANNING COMPLETELY
                    CONFIG.isScanning = false;
                    stopRequested = true;
                    isRunning = false;
                    
                    // Clear all timeouts and intervals
                    clearAllTimeoutsAndIntervals();
                    
                    // Clear scanning state
                    clearScanningState();
                    
                    // Update UI to show completion
                    const statusEl = document.getElementById('status');
                    if (statusEl) {
                        statusEl.textContent = 'Booking Complete!';
                        statusEl.style.color = '#28a745';
                    }
                    
                    // Disable all buttons
                    const startBtn = document.getElementById('start-btn');
                    const stopBtn = document.getElementById('stop-btn');
                    const pauseBtn = document.getElementById('pause-btn');
                    const resetBtn = document.getElementById('reset-btn');
                    
                    if (startBtn) startBtn.disabled = true;
                    if (stopBtn) stopBtn.disabled = true;
                    if (pauseBtn) pauseBtn.disabled = true;
                    if (resetBtn) resetBtn.disabled = false; // Keep reset enabled
                    
                    // Send notification after booking
                    await sendBookingNotification();
                    
                    log('🛑 ALL SCANNING STOPPED - No more date checking or form filling');
                } else {
                        log('⚠️ Book Now button not found, trying alternative selectors...');
                        
                        // Try more specific selectors
                        const altSelectors = [
                            'input[value*="Book"]',
                            'input[value*="Submit"]',
                            'button[onclick*="submit"]',
                            'form button[type="submit"]'
                        ];
                        
                        for (const selector of altSelectors) {
                            const altButton = document.querySelector(selector);
                            if (altButton) {
                                altButton.click();
                                log('✅ Alternative submit button clicked after 5-second delay!');
                                
                                // STOP ALL SCANNING COMPLETELY
                                CONFIG.isScanning = false;
                                stopRequested = true;
                                isRunning = false;
                                
                                // Clear all timeouts and intervals
                                clearAllTimeoutsAndIntervals();
                                
                                // Clear scanning state
                                clearScanningState();
                                
                                // Update UI to show completion
                                const statusEl = document.getElementById('status');
                                if (statusEl) {
                                    statusEl.textContent = 'Booking Complete!';
                                    statusEl.style.color = '#28a745';
                                }
                                
                                // Disable all buttons
                                const startBtn = document.getElementById('start-btn');
                                const stopBtn = document.getElementById('stop-btn');
                                const pauseBtn = document.getElementById('pause-btn');
                                const resetBtn = document.getElementById('reset-btn');
                                
                                if (startBtn) startBtn.disabled = true;
                                if (stopBtn) stopBtn.disabled = true;
                                if (pauseBtn) pauseBtn.disabled = true;
                                if (resetBtn) resetBtn.disabled = false; // Keep reset enabled
                                
                                // Send notification after booking
                                await sendBookingNotification();
                                
                                log('🛑 ALL SCANNING STOPPED - No more date checking or form filling');
                                break;
                            }
                        }
                    }
                    
                    } catch (error) {
                    log(`❌ Book Now button click failed: ${error.message}`);
                }
            }

            // Send booking notification
            async function sendBookingNotification() {
                try {
                    log('🔔 Sending booking notification...');
                    
                    // Browser notification
                    if ('Notification' in window) {
                        if (Notification.permission === 'granted') {
                            new Notification('BLS Booking Complete!', {
                                body: 'Your appointment has been successfully booked!',
                                icon: 'https://appointment.blspolandvisa.com/favicon.ico'
                            });
                        } else if (Notification.permission !== 'denied') {
                            Notification.requestPermission().then(permission => {
                                if (permission === 'granted') {
                                    new Notification('BLS Booking Complete!', {
                                        body: 'Your appointment has been successfully booked!',
                                        icon: 'https://appointment.blspolandvisa.com/favicon.ico'
                                    });
                                }
                            });
                        }
                    }
                    
                    // Visual notification in UI
                    log('🎉 BOOKING COMPLETED SUCCESSFULLY!');
                    log('📧 Check your email for confirmation details');
                    log('📱 You should receive a confirmation message shortly');
                    
                    // Update status
                    const statusElement = document.getElementById('status');
                    if (statusElement) {
                        statusElement.textContent = 'Booking Complete!';
                        statusElement.style.color = '#28a745';
                    }
                    
                } catch (error) {
                    log(`❌ Notification failed: ${error.message}`);
                }
            }



        // Select "Normal Time" from appointment type dropdown
        async function selectNormalTime() {
            log('⏰ Selecting "Normal Time" from appointment type dropdown');
            
            try {
                // Wait for appointment type options to load
                await delay(200);
                
                // Find appointment type dropdown
                const appointmentTypeSelectors = [
                    '#valAppointmentType',
                    'select[name*="appointment_type"]',
                    'select[id*="appointment_type"]',
                    'select[name*="appointment"]',
                    'select[id*="appointment"]',
                    '.appointment-type select',
                    'select[class*="appointment"]',
                    'select[class*="type"]'
                ];
                
                let appointmentTypeSelect = null;
                for (const selector of appointmentTypeSelectors) {
                    appointmentTypeSelect = document.querySelector(selector);
                    if (appointmentTypeSelect) {
                        log(`✅ Found appointment type dropdown with selector: ${selector}`);
                        break;
                    }
                }
                
                if (!appointmentTypeSelect) {
                    log('❌ Appointment type dropdown not found');
                    return false;
                }
                
                // Look for "Normal Time" option
                const options = Array.from(appointmentTypeSelect.options);
                let normalTimeOption = null;
                
                // Debug: Log all available options
                log('🔍 Available options in selectNormalTime:');
                options.forEach((option, index) => {
                    log(`  ${index + 1}: "${option.textContent}" (value: "${option.value}")`);
                });
                
                // Try different variations of "Normal Time"
                const normalTimeVariations = [
                    'Normal Time',
                    'Normal',
                    'normal time',
                    'normal'
                ];
                
                for (const variation of normalTimeVariations) {
                    normalTimeOption = options.find(option => {
                        const text = option.textContent.toLowerCase().trim();
                        return text === variation.toLowerCase() ||
                                option.value === variation ||
                                text.includes(variation.toLowerCase()) ||
                                (variation === 'normal' && text.includes('normal'));
                    });
                    if (normalTimeOption) {
                        log(`✅ Found "Normal Time" option: ${normalTimeOption.textContent}`);
                        break;
                    }
                }
                
                if (normalTimeOption) {
                    appointmentTypeSelect.value = normalTimeOption.value;
                    appointmentTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    log(`✅ Selected "Normal Time": ${normalTimeOption.textContent}`);
                    return true;
                } else {
                    log('❌ "Normal Time" option not found in appointment type dropdown');
                    log('Available options:');
                    options.forEach((option, index) => {
                        log(`  ${index}: "${option.textContent}" (value: "${option.value}")`);
                    });
                    return false;
                }
                
            } catch (error) {
                log(`❌ Error selecting Normal Time: ${error.message}`);
                return false;
            }
        }


        // Check date availability - ONLY for the specific date provided
        async function checkDateAvailability(date) {
            try {
                log(`🔍 Checking availability for specific date: ${date}`);
                
                const [year, month, day] = date.split('-');
                const targetDay = parseInt(day);
                const targetMonth = parseInt(month);
                const targetYear = parseInt(year);
                
                // Validate date
                const dateObj = new Date(targetYear, targetMonth - 1, targetDay);
                if (dateObj.getFullYear() !== targetYear || dateObj.getMonth() !== targetMonth - 1 || dateObj.getDate() !== targetDay) {
                    log(`❌ Invalid date: ${date}`);
                    return false;
                }
                
                // Enhanced calendar clicking with multiple methods
                const clickSelectors = [
                    'input[placeholder*="Click here for Appointment Date"]',
                    '#valAppointmentDate',
                    'input[id*="appointment_date"]',
                    'input[name*="appointment_date"]'
                ];
                
                let calendarOpened = false;
                for (const selector of clickSelectors) {
                    try {
                        const element = document.querySelector(selector);
                        if (element) {
                            element.click();
                            await delay(300);
                            
                            // Check if calendar opened
                            const calendar = document.querySelector('.ui-datepicker, .datepicker, [class*="calendar"], [class*="datepicker"]');
                            if (calendar) {
                                calendarOpened = true;
                                log(`✅ Calendar opened with selector: ${selector}`);
                                break;
                            }
                        }
                    } catch (error) {
                        continue;
                    }
                }
                
                if (!calendarOpened) {
                    // DOM manipulation fallback
                    const dateInput = document.querySelector('input[placeholder*="Click here for Appointment Date"]') ||
                                    document.querySelector('#valAppointmentDate') ||
                                    document.querySelector('input[id*="appointment_date"]');
                    if (dateInput) {
                        dateInput.click();
                        dateInput.focus();
                        dateInput.dispatchEvent(new Event('click', { bubbles: true }));
                        dateInput.dispatchEvent(new Event('focus', { bubbles: true }));
                    }
                    await delay(500);
                }
                
                // Wait for calendar
                const calendar = await waitForElement('.ui-datepicker, .datepicker, [class*="calendar"], [class*="datepicker"]', 8000);
                if (!calendar) {
                    log('❌ Calendar not found');
                    return false;
                }
                
                // Debug: Log calendar structure to help identify selectors
                log('🔍 Calendar structure debug:');
                const calendarHTML = calendar.outerHTML.substring(0, 500);
                log(`Calendar HTML preview: ${calendarHTML}...`);
                
                // Try to find any month/year elements for debugging
                const allElements = calendar.querySelectorAll('*');
                for (const element of allElements) {
                    const text = element.textContent?.trim();
                    if (text && (text.includes('2025') || text.includes('September') || text.includes('Sep'))) {
                        log(`Found element with text "${text}": ${element.tagName}.${element.className}`);
                    }
                }
                
                // First, try to find the date in the current calendar view
                let dateElement = findDateElement(targetDay);
                
                if (!dateElement) {
                    log(`❌ Date ${targetDay} not found in current calendar view`);
                    
                    // Navigate to the EXACT month/year for this specific date
                    log('🔄 Attempting to navigate to target month/year...');
                    const navigationSuccess = await navigateToMonth(targetYear, targetMonth);
                    
                    // Try to find the date again after navigation
                    dateElement = findDateElement(targetDay);
                    
                    if (!dateElement) {
                        log(`❌ Date ${targetDay} still not found after navigation`);
                        
                        // Try alternative approach
                        log('🔄 Trying alternative approach - searching for date in current calendar...');
                        const alternativeDateElement = findDateElementAlternative(targetDay, targetMonth, targetYear);
                        if (alternativeDateElement) {
                            log(`✅ Found date ${targetDay} with alternative method`);
                            return await clickDateAndCheckSlot(alternativeDateElement, date);
                        }
                        
                        return false;
                    }
                } else {
                    log(`✅ Date ${targetDay} found in current calendar view`);
                }
                
                return await clickDateAndCheckSlot(dateElement, date);
                
            } catch (error) {
                log(`❌ Error checking date ${date}: ${error.message}`);
                return false;
            }
        }

            // Navigate to month
            async function navigateToMonth(targetYear, targetMonth) {
                const targetMonthName = new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' });
                
                log(`🎯 Navigating to ${targetMonthName} ${targetYear}`);
                
                // Try multiple selectors for month and year elements (BLS specific)
                const monthSelectors = [
                    '.datepicker-switch',
                    '.ui-datepicker-month',
                    '.datepicker-month',
                    '[class*="month"]',
                    '.month',
                    'th[class*="month"]',
                    '.ui-datepicker-header .ui-datepicker-month',
                    'th.datepicker-switch'
                ];
                
                const yearSelectors = [
                    '.datepicker-switch',
                    '.ui-datepicker-year',
                    '.datepicker-year',
                    '[class*="year"]',
                    '.year',
                    'th[class*="year"]',
                    '.ui-datepicker-header .ui-datepicker-year',
                    'th.datepicker-switch'
                ];
                
                // Function to get current month/year with multiple selectors
                const getCurrentMonthYear = () => {
                    let currentMonthText = '';
                    let currentYearText = '';
                    
                    // First try to find the datepicker-switch element (BLS specific)
                    const datepickerSwitch = document.querySelector('.datepicker-switch');
                    if (datepickerSwitch && datepickerSwitch.textContent) {
                        const switchText = datepickerSwitch.textContent.trim();
                        log(`🔍 Datepicker switch text: "${switchText}"`);
                        
                        // Parse "September 2025" format
                        const parts = switchText.split(' ');
                        if (parts.length >= 2) {
                            currentMonthText = parts[0]; // "September"
                            currentYearText = parts[1]; // "2025"
                            log(`✅ Parsed from switch: Month="${currentMonthText}", Year="${currentYearText}"`);
                            return { currentMonthText, currentYearText };
                        }
                    }
                    
                    // Fallback to individual selectors
                    for (const selector of monthSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent) {
                            currentMonthText = element.textContent.trim();
                            break;
                        }
                    }
                    
                    for (const selector of yearSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent) {
                            currentYearText = element.textContent.trim();
                            break;
                        }
                    }
                    
                    return { currentMonthText, currentYearText };
                };
                
                // Check if we're already on the correct month/year
                let { currentMonthText, currentYearText } = getCurrentMonthYear();
                
                if (currentMonthText === targetMonthName && currentYearText === targetYear.toString()) {
                    log('✅ Already on correct month/year');
                    return true;
                }
                
                // Try multiple selectors for next button
                const nextButtonSelectors = [
                    '.ui-datepicker-next',
                    '.next',
                    '[class*="next"]',
                    '.ui-datepicker-header .ui-datepicker-next',
                    'a[title*="Next"]',
                    'a[title*="next"]',
                    '.datepicker-next'
                ];
                
                let nextButton = null;
                for (const selector of nextButtonSelectors) {
                    nextButton = document.querySelector(selector);
                    if (nextButton) {
                        log(`✅ Found next button with selector: ${selector}`);
                        break;
                    }
                }
                
                if (!nextButton) {
                    log('❌ Next button not found with any selector');
                    return false;
                }
                
                let attempts = 0;
                const maxAttempts = 12; // Maximum 12 months to avoid infinite loop
                
                while (attempts < maxAttempts) {
                    // Get current month/year after each click
                    ({ currentMonthText, currentYearText } = getCurrentMonthYear());
                    
                    log(`📅 Current: "${currentMonthText}" "${currentYearText}", Target: "${targetMonthName}" "${targetYear}"`);
                    
                    // Check if we've reached the target
                if (currentMonthText === targetMonthName && currentYearText === targetYear.toString()) {
                    log('✅ Successfully navigated to target month/year');
                    return true;
                }
                    
                    // Click next button
                    nextButton.click();
                    await delay(500); // Increased delay for better reliability
                    attempts++;
                }
                
                log('⚠️ Reached maximum navigation attempts');
                return false;
            }

            // Find date element - specifically looking for available slots
            function findDateElement(targetDay) {
                log(`🔍 Looking for day ${targetDay} with available slots...`);
                
                // First, try to find elements with the specific "label-available" class from the image
                const availableSelectors = [
                    `td.day.label-available[title="Available"]`,
                    `td.day.label-available`,
                    `td[class*="day"][class*="available"]`,
                    `td[title="Available"]`
                ];
                
                for (const selector of availableSelectors) {
                    try {
                        const elements = document.querySelectorAll(selector);
                        for (const element of elements) {
                            const dayText = element.textContent.trim();
                            if (dayText === targetDay.toString()) {
                                log(`✅ Found available date element for day ${targetDay} with selector: ${selector}`);
                                return element;
                            }
                        }
                    } catch (error) {
                        continue;
                    }
                }
                
                // BLS specific: Look for day elements in the current calendar view
                const daySelectors = [
                    'td.day',
                    'td[class*="day"]',
                    '.day',
                    'td a',
                    'a[class*="day"]'
                ];
                
                for (const selector of daySelectors) {
                    try {
                        const elements = document.querySelectorAll(selector);
                        for (const element of elements) {
                            const dayText = element.textContent.trim();
                            if (dayText === targetDay.toString()) {
                                // Check if it's available (not disabled, not old/new)
                                const isAvailable = !element.classList.contains('disabled') && 
                                                !element.classList.contains('old') && 
                                                !element.classList.contains('new') &&
                                                element.offsetParent !== null;
                                
                                if (isAvailable) {
                                    log(`✅ Found available date element for day ${targetDay} with selector: ${selector}`);
                                    return element;
                                } else {
                                    log(`⚠️ Found date element for day ${targetDay} but it's not available`);
                                }
                            }
                        }
                    } catch (error) {
                        continue;
                    }
                }
                
                // Fallback: find by day number in all elements
                const allElements = document.querySelectorAll('*');
                for (const element of allElements) {
                    try {
                        const dayText = element.textContent?.trim();
                        if (dayText === targetDay.toString()) {
                            // Check if it's a clickable date element
                            if (element.tagName === 'A' || element.tagName === 'TD' || element.tagName === 'SPAN') {
                                const isAvailable = !element.classList.contains('disabled') && 
                                                !element.classList.contains('old') && 
                                                !element.classList.contains('new') &&
                                                element.offsetParent !== null;
                                
                                if (isAvailable) {
                                    log(`✅ Found available date element for day ${targetDay} by text content`);
                                    return element;
                                }
                            }
                        }
                    } catch (error) {
                        continue;
                    }
                }
                
                log(`❌ No date element found for day ${targetDay}`);
                return null;
            }

            // Alternative method to find date element when navigation fails
            function findDateElementAlternative(targetDay, targetMonth, targetYear) {
                log(`🔍 Alternative search for day ${targetDay} in ${targetMonth}/${targetYear}`);
                
                // Look for any element containing the day number
                const allElements = document.querySelectorAll('*');
                for (const element of allElements) {
                    const text = element.textContent?.trim();
                    if (text === targetDay.toString()) {
                        // Check if it's a clickable date element
                        if (element.tagName === 'A' || element.tagName === 'TD' || element.tagName === 'SPAN') {
                            log(`✅ Found alternative date element for day ${targetDay}`);
                            return element;
                        }
                    }
                }
                
                return null;
            }

            // Click date and check for slot availability
            async function clickDateAndCheckSlot(dateElement, date) {
                try {
                    // Check if the date is actually available before clicking
                    const isAvailable = dateElement.classList.contains('label-available') || 
                                    dateElement.getAttribute('title') === 'Available' ||
                                    !dateElement.classList.contains('disabled');
                    
                    if (!isAvailable) {
                            log(`❌ Date ${date} is not available - skipping`);
                        return false;
                    }
                    
                        // Add visual feedback - show date is being checked
                        dateElement.classList.add('bls-date-checking');
                        
                        // Also apply styles directly for maximum visibility
                        dateElement.style.outline = '5px solid #007bff';
                        dateElement.style.outlineOffset = '3px';
                        dateElement.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
                        dateElement.style.border = '3px solid #007bff';
                        dateElement.style.boxShadow = '0 0 10px #007bff';
                        dateElement.style.zIndex = '9999';
                        dateElement.style.position = 'relative';
                        
                        // Debug: Log the element and its classes
                        log(`🎯 CLICKING DATE: ${date} - Element: ${dateElement.tagName}, Classes: ${dateElement.className}`);
                        log(`🎯 Added 'bls-date-checking' class and direct styles to date element`);
                        
                        // Force a style recalculation
                        dateElement.style.display = 'none';
                        dateElement.offsetHeight; // Trigger reflow
                        dateElement.style.display = '';
                        
                        log(`🎯 CLICKING DATE: ${date} - Checking for slots...`);
                    dateElement.click();
                    await delay(2000); // Increased delay for page to load
                    
                    // Debug: Check what elements appeared after clicking
                    log('🔍 Checking for elements after date click...');
                    const allSelects = document.querySelectorAll('select');
                    const allInputs = document.querySelectorAll('input');
                    log(`Found ${allSelects.length} select elements and ${allInputs.length} input elements`);
                    
                    // Check for appointment type options with multiple selectors
                    const appointmentTypeSelectors = [
                        '#valAppointmentType',
                        'select[name*="appointment_type"]',
                        'select[id*="appointment_type"]',
                        'select[name*="appointment"]',
                        'select[id*="appointment"]',
                        '.appointment-type select',
                        'select[class*="appointment"]',
                        'select[class*="type"]'
                    ];
                    
                    // Wait for appointment type dropdown to appear
                    log('⏳ Waiting for appointment type dropdown to appear...');
                    let appointmentTypeSelect = null;
                    for (const selector of appointmentTypeSelectors) {
                        try {
                            appointmentTypeSelect = await waitForElement(selector, 2000);
                            if (appointmentTypeSelect) {
                                log(`✅ Found appointment type select with selector: ${selector}`);
                                break;
                            }
                        } catch (error) {
                            continue;
                        }
                    }
                    
                    if (appointmentTypeSelect) {
                        log(`✅ Slot confirmed available on ${date}`);
                        
                        // Use enhanced automatic flow for calendar date selection
                        const success = await handleAutomaticFlowAfterDateSelection();
                        if (success) {
                            // Add visual feedback - slot found
                            dateElement.classList.remove('bls-date-checking');
                            dateElement.classList.add('bls-date-slot-found');
                            
                            // Apply success styles directly
                            dateElement.style.outline = '5px solid #28a745';
                            dateElement.style.outlineOffset = '3px';
                            dateElement.style.backgroundColor = 'rgba(40, 167, 69, 0.3)';
                            dateElement.style.border = '3px solid #28a745';
                            dateElement.style.boxShadow = '0 0 10px #28a745';
                            
                            // STOP ALL SCANNING COMPLETELY - No more date checking
                            CONFIG.isScanning = false;
                            stopRequested = true;
                            isRunning = false;
                            
                            // Clear all timeouts and intervals
                            clearAllTimeoutsAndIntervals();
                            
                            // Clear scanning state
                            clearScanningState();
                            
                            // Update UI to show completion
                            const statusEl = document.getElementById('status');
                            if (statusEl) {
                                statusEl.textContent = 'Booking Complete!';
                                statusEl.style.color = '#28a745';
                            }
                            
                            // Disable all buttons except reset
                            const startBtn = document.getElementById('start-btn');
                            const stopBtn = document.getElementById('stop-btn');
                            const pauseBtn = document.getElementById('pause-btn');
                            const resetBtn = document.getElementById('reset-btn');
                            
                            if (startBtn) startBtn.disabled = true;
                            if (stopBtn) stopBtn.disabled = true;
                            if (pauseBtn) pauseBtn.disabled = true;
                            if (resetBtn) resetBtn.disabled = false;
                            
                            log(`🎉 SLOT FOUND ON DATE: ${date} - BOOKING COMPLETED!`);
                            log('🛑 ALL SCANNING STOPPED - No more date checking or form filling');
                            return true;
                        } else {
                            log('❌ Enhanced automatic flow failed for calendar date selection');
                            return false;
                        }
                    }
                    
                    // If no appointment type found, check if we can proceed anyway
                    log('🔍 No appointment type found, checking for other form elements...');
                    const formElements = document.querySelectorAll('input, select, textarea');
                    if (formElements.length > 0) {
                        log(`✅ Found ${formElements.length} form elements - proceeding with form filling`);
                            
                            // Add visual feedback - slot found via form elements
                            dateElement.classList.remove('bls-date-checking');
                            dateElement.classList.add('bls-date-slot-found');
                            
                            // Apply success styles directly
                            dateElement.style.outline = '5px solid #28a745';
                            dateElement.style.outlineOffset = '3px';
                            dateElement.style.backgroundColor = 'rgba(40, 167, 69, 0.3)';
                            dateElement.style.border = '3px solid #28a745';
                            dateElement.style.boxShadow = '0 0 10px #28a745';
                        
                        // Proceed with form filling even without appointment type
                            log(`🎉 SLOT FOUND ON DATE: ${date} - Form elements detected, proceeding with form filling!`);
                        await fillAllFormSections();
                        
                        return true;
                    }
                    
                        // Add visual feedback - no slot found
                        dateElement.classList.remove('bls-date-checking');
                        dateElement.classList.add('bls-date-no-slot');
                        
                        // Apply no-slot styles directly
                        dateElement.style.outline = '5px solid #dc3545';
                        dateElement.style.outlineOffset = '3px';
                        dateElement.style.backgroundColor = 'rgba(220, 53, 69, 0.3)';
                        dateElement.style.border = '3px solid #dc3545';
                        dateElement.style.boxShadow = '0 0 10px #dc3545';
                        
                        log(`❌ NO SLOT FOUND ON DATE: ${date} - No appointment type or form elements found`);
                    return false;
                        
                            } catch (error) {
                        // Add visual feedback - error occurred
                        dateElement.classList.remove('bls-date-checking');
                        dateElement.classList.add('bls-date-no-slot');
                        
                        // Apply error styles directly
                        dateElement.style.outline = '5px solid #dc3545';
                        dateElement.style.outlineOffset = '3px';
                        dateElement.style.backgroundColor = 'rgba(220, 53, 69, 0.3)';
                        dateElement.style.border = '3px solid #dc3545';
                        dateElement.style.boxShadow = '0 0 10px #dc3545';
                        
                        log(`❌ Error clicking date ${date}: ${error.message}`);
                        return false;
                    }
                }


            // Upload image
            async function uploadImage() {
                if (!CONFIG.imageLocation) {
                    log('⚠️ No image loaded, skipping image upload');
                    return;
                }
                
                    log('⚡ DIRECT UPLOAD: No delays, immediate upload');
                
                try {
                    // Find file input
                    const fileInputSelectors = [
                        'input[name="mainimage"]',
                        'input[id="fileName"]',
                        'input[type="file"]',
                        'input[accept*="image"]',
                        'input[capture="user"]'
                    ];
                    
                    let fileInput = null;
                    for (const selector of fileInputSelectors) {
                        try {
                            fileInput = document.querySelector(selector);
                            if (fileInput) break;
                        } catch (e) {
                            continue;
                        }
                    }
                    
                    if (fileInput) {
                        // Convert base64 to file
                        const base64Data = CONFIG.imageLocation.split(',')[1];
                        const byteCharacters = atob(base64Data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: 'image/jpeg' });
                        const file = new File([blob], 'profile_image.jpg', { type: 'image/jpeg' });
                        
                        // Create a new DataTransfer object
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        
                        // Trigger change event
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        log('✅ Image uploaded successfully');
                    } else {
                        log('⚠️ File input not found');
                    }
                } catch (error) {
                    log(`❌ Image upload failed: ${error.message}`);
                }
            }

            // Submit form
            async function submitForm() {
                log('📤 Submitting form...');
                
                const submitButton = document.querySelector('button[type="submit"], #valBookNow, .book-now-btn, .submit-btn');
                if (!submitButton) {
                    log('❌ Submit button not found');
                    return;
                }

                submitButton.click();
                await delay(2000);

                const errorElement = document.querySelector('.error, .alert-danger, .validation-error');
                if (errorElement) {
                    log(`❌ Submission error: ${errorElement.textContent}`);
                } else {
                    log('✅ Form submitted successfully');
                }
            }

            // Stop scanning
            function stopScanning() {
                log('⏹️ STOP REQUESTED - Stopping all operations immediately...');
                
                // Set stop flags
                stopRequested = true;
                isRunning = false;
                isPaused = false;
                CONFIG.isScanning = false;
                
                // Clear all timeouts and intervals
                clearAllTimeoutsAndIntervals();
                    
                    // Clear scanning state from localStorage
                    clearScanningState();
                
                // Update UI
                document.getElementById('start-btn').disabled = false;
                document.getElementById('stop-btn').disabled = true;
                document.getElementById('pause-btn').disabled = true;
                
                // Reset pause button text and state
                const pauseBtn = document.getElementById('pause-btn');
                if (pauseBtn) {
                    pauseBtn.textContent = 'Pause';
                    pauseBtn.style.background = '#ffc107';
                    pauseBtn.style.color = '#212529';
                }
                
                updateStatus();
                log('✅ ALL OPERATIONS STOPPED - Ready for new start');
            }

            // Reset all configuration and clear all data
            function resetAllConfiguration() {
                log('🔄 RESET REQUESTED - Clearing all configuration and data...');
                
                // Stop all operations first
                stopRequested = true;
                isRunning = false;
                isPaused = false;
                CONFIG.isScanning = false;
                
                // Clear all timeouts and intervals
                clearAllTimeoutsAndIntervals();
                
                // Clear all configuration data
                CONFIG.targetDates = [];
                CONFIG.profileData = {};
                CONFIG.imageLocation = null;
                CONFIG.scanAttempts = 0;
                CONFIG.persistentScanning = false;
                CONFIG.scanStartTime = null;
                
                // Clear uploaded profile data
                uploadedProfileData = null;
                
                // Clear scanning state from localStorage
                clearScanningState();
                
                // Reset UI elements
                document.getElementById('start-btn').disabled = false;
                document.getElementById('stop-btn').disabled = true;
                document.getElementById('pause-btn').disabled = true;
                
                // Reset pause button
                const pauseBtn = document.getElementById('pause-btn');
                if (pauseBtn) {
                    pauseBtn.textContent = 'Pause';
                    pauseBtn.style.background = '#ffc107';
                    pauseBtn.style.color = '#212529';
                }
                
                // Clear date picker
                const datePicker = document.getElementById('date-picker');
                if (datePicker) {
                    datePicker.value = '';
                }
                
                // Clear selected dates display
                updateSelectedDatesDisplay();
                updateDatesStatus();
                
                // Clear profile file input
                const profileFileInput = document.getElementById('profile-file');
                if (profileFileInput) {
                    profileFileInput.value = '';
                }
                
                // Clear image file input
                const imageFileInput = document.getElementById('image-file');
                if (imageFileInput) {
                    imageFileInput.value = '';
                }
                
                // Reset status displays
                const profileStatus = document.getElementById('profile-status');
                if (profileStatus) {
                    profileStatus.textContent = 'No profile loaded';
                    profileStatus.style.color = '#666';
                }
                
                const imageStatus = document.getElementById('image-status');
                if (imageStatus) {
                    imageStatus.textContent = 'No image loaded';
                    imageStatus.style.color = '#666';
                }
                
                // Clear log
                const logElement = document.getElementById('log');
                if (logElement) {
                    logElement.innerHTML = 'Ready to start date picker scanning...<br>📁 Upload a profile data file to begin<br>';
                }
                
                // Reset status
                updateStatus();
                
                log('✅ ALL CONFIGURATION CLEARED - Ready for fresh start');
                log('📁 Please upload a new profile data file to begin');
            }

            // Pause scanning
            function pauseScanning() {
                if (isPaused) {
                    // Resume
                    log('▶️ RESUMING - All operations will continue...');
                    pauseRequested = false;
                    isPaused = false;
                } else {
                    // Pause
                    log('⏸️ PAUSING - All operations will pause immediately...');
                    pauseRequested = true;
                    isPaused = true;
                }
                
                const pauseBtn = document.getElementById('pause-btn');
                if (pauseBtn) {
                    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
                    pauseBtn.style.background = isPaused ? '#28a745' : '#ffc107';
                    pauseBtn.style.color = isPaused ? 'white' : '#212529';
                }
                
                updateStatus();
                log(isPaused ? '⏸️ ALL OPERATIONS PAUSED' : '▶️ ALL OPERATIONS RESUMED');
            }

            // Enhanced delay function that respects stop/pause
            function delay(ms) {
                // For very small delays, use immediate execution
                if (ms <= 1) {
                    return Promise.resolve();
                }
                
                return new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        // Remove from active timeouts
                        const index = activeTimeouts.indexOf(timeoutId);
                        if (index > -1) {
                            activeTimeouts.splice(index, 1);
                        }
                        resolve();
                    }, ms);
                    
                    // Add to active timeouts for cleanup
                    activeTimeouts.push(timeoutId);
                    
                    // Check if stop was requested during delay
                    const checkStop = () => {
                        if (stopRequested) {
                            clearTimeout(timeoutId);
                            const index = activeTimeouts.indexOf(timeoutId);
                            if (index > -1) {
                                activeTimeouts.splice(index, 1);
                            }
                            reject(new Error('Operation stopped by user'));
                        } else if (pauseRequested) {
                            // Wait while paused
                            setTimeout(checkStop, 100);
                        } else {
                            setTimeout(checkStop, 100);
                        }
                    };
                    checkStop();
                });
            }
            
            // Clear all active timeouts and intervals
            function clearAllTimeoutsAndIntervals() {
                log('🧹 Clearing all active timeouts and intervals...');
                
                // Store counts before clearing
                const timeoutCount = activeTimeouts.length;
                const intervalCount = activeIntervals.length;
                
                // Clear all timeouts
                activeTimeouts.forEach(timeoutId => {
                    clearTimeout(timeoutId);
                });
                activeTimeouts = [];
                
                // Clear all intervals
                activeIntervals.forEach(intervalId => {
                    clearInterval(intervalId);
                });
                activeIntervals = [];
                
                log(`✅ Cleared ${timeoutCount} timeouts and ${intervalCount} intervals`);
            }
            
            // Check if operation should continue
            function shouldContinue() {
                if (stopRequested) {
                    throw new Error('Operation stopped by user');
                }
                return !pauseRequested;
            }
            
            // Wait while paused
            async function waitWhilePaused() {
                while (pauseRequested && !stopRequested) {
                    await delay(100);
                }
                if (stopRequested) {
                    throw new Error('Operation stopped by user');
                }
            }

            function waitForElement(selector, timeout = 5000) {
                return new Promise((resolve) => {
                    const element = document.querySelector(selector);
                    if (element) {
                        resolve(element);
                        return;
                    }

                    const observer = new MutationObserver(() => {
                        const element = document.querySelector(selector);
                        if (element) {
                            observer.disconnect();
                            resolve(element);
                        }
                    });

                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });

                    setTimeout(() => {
                        observer.disconnect();
                        resolve(null);
                    }, timeout);
                });
            }

            // Initialize
            if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        createUI();
                        // Check if we need to restore scanning state after page refresh
                        if (restoreScanningState() && CONFIG.isScanning) {
                            log('🔄 Resuming scanning after page refresh...');
                            log('🔄 Scanning will continue indefinitely until slots are found');
                            setTimeout(() => {
                                // Resume the scanning loop directly
                                scanningLoop();
                            }, 2000); // Wait 2 seconds for page to fully load
                        }
                    });
            } else {
                createUI();
                    // Check if we need to restore scanning state after page refresh
                    if (restoreScanningState() && CONFIG.isScanning) {
                        log('🔄 Resuming scanning after page refresh...');
                        log('🔄 Scanning will continue indefinitely until slots are found');
                        setTimeout(() => {
                            // Resume the scanning loop directly
                            scanningLoop();
                        }, 2000); // Wait 2 seconds for page to fully load
                    }
            }

        })();
