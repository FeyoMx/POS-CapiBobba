// Reports module
// Contains all reporting and analytics functions

import { reportContent } from './dom-elements.js';
import { dailySales } from './data-management.js';

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
    const dailyTotals = new Map();

    dailySales.forEach(sale => {
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
    const weeklyTotals = new Map();

    dailySales.forEach(sale => {
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
    const monthlyTotals = new Map();

    dailySales.forEach(sale => {
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

export function renderReport(reportType) {
    let reportData = [];
    let reportTitle = '';

    if (dailySales.length === 0) {
        reportContent.innerHTML = '<p style="text-align: center; color: var(--text-gray);">No hay ventas registradas para generar informes.</p>';
        return;
    }

    switch (reportType) {
        case 'daily':
            reportData = generateDailyReport();
            reportTitle = 'Informe de Ventas Diario';
            break;
        case 'weekly':
            reportData = generateWeeklyReport();
            reportTitle = 'Informe de Ventas Semanal';
            break;
        case 'monthly':
            reportData = generateMonthlyReport();
            reportTitle = 'Informe de Ventas Mensual';
            break;
        default:
            reportContent.innerHTML = '<p style="text-align: center; color: var(--text-gray);">Selecciona un tipo de informe para ver los resultados.</p>';
            return;
    }

    let reportHtml = `<h3>${reportTitle}</h3>`;
    if (reportData.length > 0) {
        reportHtml += '<ul role="list">';
        reportData.forEach(item => {
            reportHtml += `<li role="listitem"><span>${item.period}</span><span>$${item.total.toFixed(2)}</span></li>`;
        });
        reportHtml += '</ul>';
    } else {
        reportHtml += '<p style="text-align: center; color: var(--text-gray);">No hay datos para este informe.</p>';
    }
    reportContent.innerHTML = reportHtml;
}