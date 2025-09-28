// Reports module
// Contains all reporting and analytics functions

import { reportContent } from './dom-elements.js';
import { dailySales } from './data-management.js';
import { optimizedSalesManager } from './firestore-optimization.js';
import { showMessage } from './modals.js';

export function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getMondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

export function generateDailyReport() {
    return generateDailyReportFromData(dailySales);
}

export function generateDailyReportFromData(salesData) {
    const dailyTotals = new Map();

    salesData.forEach(sale => {
        const saleDate = formatDate(sale.timestamp);
        const currentTotal = dailyTotals.get(saleDate) || 0;
        dailyTotals.set(saleDate, currentTotal + sale.total);
    });

    const report = Array.from(dailyTotals.entries()).map(([date, total]) => ({
        period: date,
        total: total
    }));

    report.sort((a, b) => new Date(a.period) - new Date(b.period));
    return report;
}

export function generateWeeklyReport() {
    return generateWeeklyReportFromData(dailySales);
}

export function generateWeeklyReportFromData(salesData) {
    const weeklyTotals = new Map();

    salesData.forEach(sale => {
        const mondayOfWeek = getMondayOfWeek(sale.timestamp);
        const weekKey = formatDate(mondayOfWeek);
        const currentTotal = weeklyTotals.get(weekKey) || 0;
        weeklyTotals.set(weekKey, currentTotal + sale.total);
    });

    const report = Array.from(weeklyTotals.entries()).map(([weekStart, total]) => ({
        period: `Semana del ${weekStart}`,
        total: total
    }));

    report.sort((a, b) => new Date(a.period.replace('Semana del ', '')) - new Date(b.period.replace('Semana del ', '')));
    return report;
}

export function generateMonthlyReport() {
    return generateMonthlyReportFromData(dailySales);
}

export function generateMonthlyReportFromData(salesData) {
    const monthlyTotals = new Map();

    salesData.forEach(sale => {
        const d = new Date(sale.timestamp);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const currentTotal = monthlyTotals.get(monthKey) || 0;
        monthlyTotals.set(monthKey, currentTotal + sale.total);
    });

    const report = Array.from(monthlyTotals.entries()).map(([month, total]) => ({
        period: month,
        total: total
    }));

    report.sort((a, b) => a.period.localeCompare(b.period));
    return report;
}

export async function renderReport(reportType) {
    try {
        // Show loading message
        reportContent.innerHTML = '<p style="text-align: center; color: var(--text-gray);">Cargando informe completo...</p>';

        // Get all sales data for comprehensive reports
        let allSales;
        try {
            allSales = await optimizedSalesManager.getAllSales();
            console.log(`[Reports] Retrieved ${allSales.length} total sales for ${reportType} report`);
        } catch (error) {
            console.warn('[Reports] Failed to get all sales, falling back to cached data:', error);
            allSales = dailySales;
            showMessage('Datos Limitados', 'Mostrando informe basado en ventas recientes. Para un informe completo, verifica tu conexión.');
        }

        if (allSales.length === 0) {
            reportContent.innerHTML = '<p style="text-align: center; color: var(--text-gray);">No hay ventas registradas para generar informes.</p>';
            return;
        }

        let reportData = [];
        let reportTitle = '';

        switch (reportType) {
            case 'daily':
                reportData = generateDailyReportFromData(allSales);
                reportTitle = `Informe de Ventas Diario (${allSales.length} ventas)`;
                break;
            case 'weekly':
                reportData = generateWeeklyReportFromData(allSales);
                reportTitle = `Informe de Ventas Semanal (${allSales.length} ventas)`;
                break;
            case 'monthly':
                reportData = generateMonthlyReportFromData(allSales);
                reportTitle = `Informe de Ventas Mensual (${allSales.length} ventas)`;
                break;
            default:
                reportContent.innerHTML = '<p style="text-align: center; color: var(--text-gray);">Selecciona un tipo de informe para ver los resultados.</p>';
                return;
        }

        let reportHtml = `<h3>${reportTitle}</h3>`;
        if (reportData.length > 0) {
            const totalSales = reportData.reduce((sum, item) => sum + item.total, 0);
            reportHtml += `<p><strong>Total General: $${totalSales.toFixed(2)}</strong></p>`;
            reportHtml += '<ul role="list">';
            reportData.forEach(item => {
                reportHtml += `<li role="listitem"><span>${item.period}</span><span>$${item.total.toFixed(2)}</span></li>`;
            });
            reportHtml += '</ul>';
        } else {
            reportHtml += '<p style="text-align: center; color: var(--text-gray);">No hay datos para este informe.</p>';
        }
        reportContent.innerHTML = reportHtml;
    } catch (error) {
        console.error('[Reports] Error generating report:', error);
        reportContent.innerHTML = '<p style="text-align: center; color: var(--error-color);">Error al generar el informe. Por favor, intenta de nuevo.</p>';
    }
}