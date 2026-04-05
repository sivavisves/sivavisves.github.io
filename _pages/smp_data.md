---
title: "Malaysia System Marginal Price (SMP) Visualizer"
layout: single
permalink: /smp_data/
author_profile: true
---

<!-- Import external charting library -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- Custom CSS for the SMP visualizer -->
<link rel="stylesheet" href="{{ base_path }}/assets/css/smp-visualizer.css">

<div class="smp-container">
    <p class="smp-description">
        Select a start and end date to dynamically fetch and visualize the historical System Marginal Price (SMP) data for Malaysia. You can also export the retrieved data locally to a CSV file.
    </p>
    
    <div class="smp-controls">
        <div class="smp-input-group">
            <label for="startDate">Start Date:</label>
            <input type="date" id="startDate" name="startDate" value="2023-01-01">
        </div>
        
        <div class="smp-input-group">
            <label for="endDate">End Date:</label>
            <input type="date" id="endDate" name="endDate" value="2023-01-04">
        </div>
        
        <button id="fetchBtn" class="smp-btn smp-btn-primary">Fetch & Visualize Data</button>
        <button id="downloadBtn" class="smp-btn smp-btn-secondary" style="display: none;">Download CSV</button>
    </div>

    <div id="loading" class="smp-loading" style="display: none;">
        <div class="spinner"></div>
        <p>Fetching data securely from the API, please wait...</p>
    </div>

    <div id="errorBox" class="smp-error" style="display: none;"></div>

    <div class="smp-chart-container">
        <canvas id="smpChart"></canvas>
    </div>
</div>

<!-- Custom JS logic -->
<script src="{{ base_path }}/assets/js/smp-visualizer.js"></script>
