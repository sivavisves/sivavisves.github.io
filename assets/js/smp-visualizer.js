/**
 * SMP Downloader logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadBtn');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const loadingEl = document.getElementById('loading');
    const errorBox = document.getElementById('errorBox');
    const successBox = document.getElementById('successBox');
    
    // Safety check just in case the JS is loaded on pages without the downloader.
    if (!downloadBtn || !startDateInput || !endDateInput) return;

    // Restrict date inputs to the current date to prevent future selection
    const today = new Date().toLocaleDateString('en-CA'); // 'en-CA' outputs YYYY-MM-DD
    startDateInput.max = today;
    endDateInput.max = today;

    downloadBtn.addEventListener('click', fetchAndDownloadData);

    async function fetchAndDownloadData() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!startDate || !endDate) {
            showError('Please select both a start and end date.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            showError('Start Date must be before or equal to End Date.');
            return;
        }
        if (startDate > today || endDate > today) {
            showError('Start Date and End Date cannot be in the future.');
            return;
        }

        hideError();
        hideSuccess();
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Fetching Data...';
        loadingEl.style.display = 'flex';

        // Construct the target URL
        // This is necessary because the official Sitefinity API rejects browser OPTIONS/CORS requests.
        const targetUrl = `https://pro.sbdpf.cloud.sitefinity.com/api/v1/smp/actual-forecast?startDate=${startDate}&endDate=${endDate}`;
        
        // List of CORS proxies to try sequentially to improve reliability
        const proxies = [
            `https://api.codetabs.com/v1/proxy?quest=${targetUrl}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
        ];

        try {
            let response = null;
            let success = false;
            let responseText = "";

            for (const proxyUrl of proxies) {
                try {
                    response = await fetch(proxyUrl);
                    if (response.ok) {
                        responseText = await response.text();
                        // Verify that we actually received valid JSON and not a proxy html error page
                        JSON.parse(responseText); 
                        success = true;
                        break;
                    }
                } catch (e) {
                    console.warn(`Proxy ${proxyUrl} failed.`);
                }
            }

            if (!success) {
                throw new Error("API returned an error or all CORS proxies failed.");
            }
            
            let data = JSON.parse(responseText);
            
            if (!data || !data.meta || !data.meta.data || !data.meta.data.actual) {
                throw new Error('Data format returned from API is unexpected.');
            }

            const actualData = data.meta.data.actual;
            if (actualData.length === 0) {
                throw new Error('No data available for the selected dates.');
            }

            triggerDownload(actualData, startDate, endDate);
            showSuccess('Data fully loaded! Download initiated.');
            
        } catch (error) {
            showError(`Error fetching data: ${error.message}`);
            console.error(error);
        } finally {
            loadingEl.style.display = 'none';
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Download Data (CSV)';
        }
    }

    function triggerDownload(dataArray, startDate, endDate) {
        // Setup initial CSV row headers
        const csvRows = [["Time", "Price"]];

        dataArray.forEach(item => {
            const timeLabel = item.t.replace('T', ' '); // Replace T with space for cleaner look
            const priceCode = item.v;
            csvRows.push([timeLabel, priceCode]);
        });

        const csvContent = csvRows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const filename = `smp_data_${startDate}_to_${endDate}.csv`;
        
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    function showError(msg) {
        hideSuccess(); // Ensure success is hidden when showing an error
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
    }
    
    function hideError() {
        errorBox.style.display = 'none';
    }

    function showSuccess(msg) {
        hideError(); // Ensure error is hidden when showing success
        successBox.textContent = msg;
        successBox.style.display = 'block';
    }

    function hideSuccess() {
        successBox.style.display = 'none';
    }
});
