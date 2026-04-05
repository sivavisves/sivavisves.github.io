/**
 * SMP Visualizer logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const fetchBtn = document.getElementById('fetchBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const loadingEl = document.getElementById('loading');
    const errorBox = document.getElementById('errorBox');
    const canvas = document.getElementById('smpChart');
    
    // Safety check just in case the JS is loaded on pages without the visualizer.
    if (!fetchBtn || !startDateInput || !endDateInput) return;

    // Restrict date inputs to the current date to prevent future selection
    // Convert to target timezone if needed, or simply use local calendar date
    const today = new Date().toLocaleDateString('en-CA'); // 'en-CA' outputs YYYY-MM-DD
    startDateInput.max = today;
    endDateInput.max = today;

    let chartInstance = null;
    let currentCsvData = null;

    fetchBtn.addEventListener('click', fetchData);
    downloadBtn.addEventListener('click', downloadCSV);

    async function fetchData() {
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
        downloadBtn.style.display = 'none';
        loadingEl.style.display = 'flex';
        currentCsvData = null;

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
                    // Ignore error and try the next proxy
                    console.warn(`Proxy ${proxyUrl} failed.`);
                }
            }

            if (!success) {
                throw new Error("API returned an error or all CORS proxies failed.");
            }
            
            let data = JSON.parse(responseText);
            
            if (!data || !data.data || !data.data.actual) {
                throw new Error('Data format returned from API is unexpected.');
            }

            const actualData = data.data.actual;
            if (actualData.length === 0) {
                throw new Error('No data available for the selected dates.');
            }

            processAndChartData(actualData, startDate, endDate);
            
            loadingEl.style.display = 'none';
            downloadBtn.style.display = 'inline-block';
        } catch (error) {
            loadingEl.style.display = 'none';
            showError(`Error fetching data: ${error.message}`);
            console.error(error);
        }
    }

    function processAndChartData(dataArray, startDate, endDate) {
        const labels = [];
        const prices = [];
        
        // Setup initial CSV row headers
        const csvRows = [["Time", "Price"]];

        dataArray.forEach(item => {
            const timeLabel = item.t.replace('T', ' '); // Replace T with space for cleaner look
            const priceCode = item.v;
            
            labels.push(timeLabel);
            prices.push(priceCode);
            csvRows.push([timeLabel, priceCode]);
        });

        currentCsvData = csvRows;

        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        // AcademicPages often has light backgrounds by default, but we adapt if the user overrides
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#e5e7eb' : '#374151';

        // Clear existing chart instance if user presses fetch again
        if (chartInstance) {
            chartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        
        // Add a smooth fading gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'System Marginal Price (SMP)',
                    data: prices,
                    borderColor: '#3b82f6',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.2 // Smooth interpolation
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Malaysia SMP Data (${startDate} to ${endDate})`,
                        color: textColor,
                        font: { size: 16 }
                    },
                    legend: {
                        labels: { color: textColor }
                    },
                    tooltip: {
                        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: isDarkMode ? '#fff' : '#000',
                        bodyColor: isDarkMode ? '#fff' : '#000',
                        borderColor: '#3b82f6',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            maxTicksLimit: 15
                        }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: textColor },
                        title: {
                            display: true,
                            text: 'Price (RM)',
                            color: textColor
                        }
                    }
                }
            }
        });
    }

    function downloadCSV() {
        if (!currentCsvData) return;
        
        const csvContent = currentCsvData.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
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
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
    }
    
    function hideError() {
        errorBox.style.display = 'none';
    }
    
    // Automatically fetch defaults on load if inputs are present
    if (startDateInput.value && endDateInput.value) {
        fetchData();
    }
});
