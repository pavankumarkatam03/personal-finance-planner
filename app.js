// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initApp();
});

// Main application class
class FinancePlanner {
    constructor() {
        // Initialize properties
        this.transactions = [];
        this.budgets = [];
        this.settings = {
            currencySymbol: '$',
            firstDayOfWeek: 1, // Monday
            darkMode: false,
            incomeCategories: ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other Income'],
            expenseCategories: ['Rent', 'Food', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Education', 'Shopping', 'Other Expenses'],
            notifications: {
                enabled: true,
                dailyTime: '18:00',
                budgetAlerts: true,
                largeExpenseAlerts: true,
                largeExpenseThreshold: 100.00
            }
        };
        
        // Initialize charts
        this.spendingChart = null;
        this.budgetChart = null;
        this.incomeChart = null;
        this.expenseChart = null;
        this.categoryChart = null;
        this.categoryTrendChart = null;
        
        // Load data from localStorage
        this.loadData();
        
        // Apply settings
        this.applySettings();
    }
    
    // Load data from localStorage
    loadData() {
        const savedTransactions = localStorage.getItem('financePlannerTransactions');
        const savedBudgets = localStorage.getItem('financePlannerBudgets');
        const savedSettings = localStorage.getItem('financePlannerSettings');
        
        if (savedTransactions) {
            this.transactions = JSON.parse(savedTransactions);
        }
        
        if (savedBudgets) {
            this.budgets = JSON.parse(savedBudgets);
        }
        
        if (savedSettings) {
            // Merge saved settings with defaults
            this.settings = {...this.settings, ...JSON.parse(savedSettings)};
        }
    }
    
    // Save data to localStorage
    saveData() {
        localStorage.setItem('financePlannerTransactions', JSON.stringify(this.transactions));
        localStorage.setItem('financePlannerBudgets', JSON.stringify(this.budgets));
        localStorage.setItem('financePlannerSettings', JSON.stringify(this.settings));
    }
    
    // Apply settings to the UI
    applySettings() {
        // Apply dark mode if enabled
        if (this.settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Update currency symbol in displays
        document.querySelectorAll('.currency-symbol').forEach(el => {
            el.textContent = this.settings.currencySymbol;
        });
    }
    
    // Add a new transaction
    addTransaction(transaction) {
        // Generate a unique ID for the transaction
        transaction.id = Date.now().toString();
        transaction.createdAt = new Date().toISOString();
        
        this.transactions.push(transaction);
        this.saveData();
        
        // Check for budget alerts if this is an expense
        if (transaction.type === 'expense' && this.settings.notifications.budgetAlerts) {
            this.checkBudgetAlerts(transaction);
        }
        
        // Check for large expense alerts
        if (transaction.type === 'expense' && 
            transaction.amount >= this.settings.notifications.largeExpenseThreshold && 
            this.settings.notifications.largeExpenseAlerts) {
            this.showAlert(`Large expense recorded: ${this.formatCurrency(transaction.amount)} for ${transaction.category}`);
        }
        
        return transaction;
    }
    
    // Check for budget alerts
    checkBudgetAlerts(transaction) {
        const budget = this.budgets.find(b => b.category === transaction.category);
        if (!budget) return;
        
        const monthlyExpenses = this.getMonthlyExpensesByCategory(new Date(transaction.date).getMonth(), new Date(transaction.date).getFullYear());
        const categoryExpenses = monthlyExpenses.find(e => e.category === transaction.category)?.total || 0;
        
        if (categoryExpenses > budget.amount) {
            this.showAlert(`Budget exceeded for ${transaction.category}! You've spent ${this.formatCurrency(categoryExpenses)} of your ${this.formatCurrency(budget.amount)} budget.`);
        } else if (categoryExpenses >= budget.amount * 0.9) {
            this.showAlert(`Approaching budget limit for ${transaction.category}. You've spent ${this.formatCurrency(categoryExpenses)} of your ${this.formatCurrency(budget.amount)} budget.`);
        }
    }
    
    // Show an alert notification
    showAlert(message) {
        // In a real app, you might use a more sophisticated notification system
        alert(message);
    }
    
    // Update a transaction
    updateTransaction(id, updates) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions[index] = {...this.transactions[index], ...updates};
            this.saveData();
            return true;
        }
        return false;
    }
    
    // Delete a transaction
    deleteTransaction(id) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions.splice(index, 1);
            this.saveData();
            return true;
        }
        return false;
    }
    
    // Add or update a budget
    setBudget(category, amount) {
        const existingIndex = this.budgets.findIndex(b => b.category === category);
        
        if (existingIndex !== -1) {
            this.budgets[existingIndex].amount = amount;
        } else {
            this.budgets.push({ category, amount });
        }
        
        this.saveData();
    }
    
    // Delete a budget
    deleteBudget(category) {
        const index = this.budgets.findIndex(b => b.category === category);
        if (index !== -1) {
            this.budgets.splice(index, 1);
            this.saveData();
            return true;
        }
        return false;
    }
    
    // Get transactions filtered by various criteria
    getTransactions(filter = {}) {
        let filtered = [...this.transactions];
        
        // Filter by month and year if specified
        if (filter.month !== undefined && filter.year !== undefined) {
            filtered = filtered.filter(t => {
                const date = new Date(t.date);
                return date.getMonth() === filter.month && date.getFullYear() === filter.year;
            });
        } else if (filter.year !== undefined) {
            filtered = filtered.filter(t => new Date(t.date).getFullYear() === filter.year);
        }
        
        // Filter by type if specified
        if (filter.type) {
            filtered = filtered.filter(t => t.type === filter.type);
        }
        
        // Filter by category if specified
        if (filter.category && filter.category !== 'all') {
            filtered = filtered.filter(t => t.category === filter.category);
        }
        
        // Filter by date range if specified
        if (filter.startDate && filter.endDate) {
            filtered = filtered.filter(t => {
                const date = new Date(t.date);
                return date >= new Date(filter.startDate) && date <= new Date(filter.endDate);
            });
        }
        
        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return filtered;
    }
    
    // Get summary data for the dashboard
    getSummary() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Get current month transactions
        const monthlyTransactions = this.getTransactions({ month: currentMonth, year: currentYear });
        
        // Calculate totals
        const income = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const balance = income - expenses;
        
        // Get recent transactions (last 5)
        const recentTransactions = [...this.transactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
            
        // Get expenses by category for the chart
        const expensesByCategory = this.getMonthlyExpensesByCategory(currentMonth, currentYear);
        
        return {
            income,
            expenses,
            balance,
            recentTransactions,
            expensesByCategory
        };
    }
    
    // Get monthly expenses grouped by category
    getMonthlyExpensesByCategory(month, year) {
        const monthlyExpenses = this.getTransactions({ 
            month, 
            year, 
            type: 'expense' 
        });
        
        const categoryMap = {};
        
        monthlyExpenses.forEach(transaction => {
            if (!categoryMap[transaction.category]) {
                categoryMap[transaction.category] = 0;
            }
            categoryMap[transaction.category] += transaction.amount;
        });
        
        return Object.entries(categoryMap).map(([category, total]) => ({
            category,
            total
        })).sort((a, b) => b.total - a.total);
    }
    
    // Get budget summary
    getBudgetSummary(month, year) {
        const expensesByCategory = this.getMonthlyExpensesByCategory(month, year);
        
        return this.budgets.map(budget => {
            const spent = expensesByCategory.find(e => e.category === budget.category)?.total || 0;
            return {
                category: budget.category,
                budget: budget.amount,
                spent,
                remaining: budget.amount - spent
            };
        });
    }
    
    // Get monthly summaries for all months with data
    getMonthlySummaries() {
        if (this.transactions.length === 0) return [];
        
        // Get all unique month/year combinations
        const monthYears = {};
        this.transactions.forEach(t => {
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            monthYears[key] = { year: date.getFullYear(), month: date.getMonth() };
        });
        
        // Calculate summary for each month
        return Object.values(monthYears)
            .map(({ year, month }) => {
                const transactions = this.getTransactions({ month, year });
                
                const income = transactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);
                    
                const expenses = transactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);
                    
                return {
                    year,
                    month,
                    income,
                    expenses,
                    savings: income - expenses,
                    transactionCount: transactions.length
                };
            })
            .sort((a, b) => {
                // Sort by year and month (newest first)
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });
    }
    
    // Get category analysis data
    getCategoryAnalysis(type, period) {
        let transactions = [];
        const now = new Date();
        
        // Determine date range based on period
        switch (period) {
            case 'current':
                transactions = this.getTransactions({ 
                    month: now.getMonth(), 
                    year: now.getFullYear(), 
                    type 
                });
                break;
            case 'last-3':
                transactions = this.getLastNMonthsTransactions(3, type);
                break;
            case 'last-6':
                transactions = this.getLastNMonthsTransactions(6, type);
                break;
            case 'last-12':
                transactions = this.getLastNMonthsTransactions(12, type);
                break;
            case 'all':
                transactions = this.getTransactions({ type });
                break;
        }
        
        // Group by category
        const categoryMap = {};
        transactions.forEach(t => {
            if (!categoryMap[t.category]) {
                categoryMap[t.category] = 0;
            }
            categoryMap[t.category] += t.amount;
        });
        
        // Convert to array and sort
        const categories = Object.entries(categoryMap)
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total);
            
        // Calculate total for percentages
        const grandTotal = categories.reduce((sum, c) => sum + c.total, 0);
        
        // Add percentage to each category
        categories.forEach(c => {
            c.percentage = grandTotal > 0 ? (c.total / grandTotal) * 100 : 0;
        });
        
        return {
            categories,
            grandTotal,
            period,
            type
        };
    }
    
    // Get transactions for the last N months
    getLastNMonthsTransactions(n, type) {
        const now = new Date();
        let result = [];
        
        for (let i = 0; i < n; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthTransactions = this.getTransactions({ 
                month: date.getMonth(), 
                year: date.getFullYear(), 
                type 
            });
            result = result.concat(monthTransactions);
        }
        
        return result;
    }
    
    // Get category trend data
    getCategoryTrends(category, type) {
        const now = new Date();
        const trendData = [];
        
        // Get data for last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
            
            const monthlyTransactions = this.getTransactions({ 
                month: date.getMonth(), 
                year: date.getFullYear(), 
                type 
            });
            
            const categoryTotal = monthlyTransactions
                .filter(t => t.category === category)
                .reduce((sum, t) => sum + t.amount, 0);
                
            trendData.push({
                month: monthKey,
                total: categoryTotal
            });
        }
        
        return trendData;
    }
    
    // Format currency based on settings
    formatCurrency(amount) {
        return `${this.settings.currencySymbol}${amount.toFixed(2)}`;
    }
    
    // Export data in various formats
    exportData(format, options = {}) {
        let data, filename, mimeType;
        
        // Prepare data based on content type
        switch (options.content) {
            case 'transactions':
                data = this.getTransactions(options.dateRange);
                filename = 'transactions';
                break;
            case 'budgets':
                data = this.budgets;
                filename = 'budgets';
                break;
            case 'reports':
                data = this.getMonthlySummaries();
                filename = 'reports';
                break;
            case 'all':
                data = {
                    transactions: this.transactions,
                    budgets: this.budgets,
                    settings: this.settings
                };
                filename = 'finance-planner-export';
                break;
        }
        
        // Handle different export formats
        switch (format) {
            case 'csv':
                return this.exportToCSV(data, filename);
            case 'json':
                return this.exportToJSON(data, filename);
            case 'pdf':
                return this.exportToPDF(data, filename, options.content);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    
    // Export to CSV
    exportToCSV(data, filename) {
        let csvContent = '';
        
        // Handle array of transactions or budgets
        if (Array.isArray(data)) {
            if (data.length === 0) {
                csvContent = 'No data to export';
            } else {
                // Extract headers
                const headers = Object.keys(data[0]);
                csvContent += headers.join(',') + '\n';
                
                // Add rows
                data.forEach(item => {
                    csvContent += headers.map(header => {
                        // Handle nested objects if needed
                        if (typeof item[header] === 'object') {
                            return JSON.stringify(item[header]);
                        }
                        return item[header];
                    }).join(',') + '\n';
                });
            }
        } else {
            // Handle object (full export)
            csvContent = 'Data Type,Content\n';
            Object.entries(data).forEach(([key, value]) => {
                csvContent += `${key},"${JSON.stringify(value)}"\n`;
            });
        }
        
        // Create download link
        this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
    }
    
    // Export to JSON
    exportToJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
    }
    
    // Export to PDF
    exportToPDF(data, filename, contentType) {
        // Use jsPDF with autoTable plugin
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text(`Finance Planner Export - ${contentType.toUpperCase()}`, 14, 15);
        doc.setFontSize(12);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);
        
        // Handle different content types
        if (Array.isArray(data)) {
            if (data.length === 0) {
                doc.text('No data to export', 14, 30);
            } else {
                // Prepare data for the table
                const headers = Object.keys(data[0]);
                const rows = data.map(item => {
                    return headers.map(header => {
                        // Format dates if needed
                        if (header.toLowerCase().includes('date') && item[header]) {
                            return new Date(item[header]).toLocaleDateString();
                        }
                        // Handle amounts
                        if ((header === 'amount' || header === 'total' || header === 'budget' || header === 'spent' || header === 'remaining') && item[header] !== undefined) {
                            return this.formatCurrency(item[header]);
                        }
                        return item[header] !== undefined ? item[header].toString() : '';
                    });
                });
                
                // Add table
                doc.autoTable({
                    head: [headers],
                    body: rows,
                    startY: 30,
                    styles: {
                        fontSize: 8,
                        cellPadding: 2
                    },
                    headStyles: {
                        fillColor: [78, 115, 223]
                    }
                });
            }
        } else {
            // Handle full export
            let y = 30;
            Object.entries(data).forEach(([key, value]) => {
                doc.text(`${key}:`, 14, y);
                y += 7;
                doc.text(JSON.stringify(value, null, 2), 20, y, { maxWidth: 180 });
                y += 20;
            });
        }
        
        // Save the PDF
        doc.save(`${filename}.pdf`);
    }
    
    // Helper to create download link
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
}

// Initialize the application
function initApp() {
    // Create the finance planner instance
    const financePlanner = new FinancePlanner();
    
    // Initialize UI components
    initNavigation(financePlanner);
    initDashboard(financePlanner);
    initTransactionForm(financePlanner);
    initTransactionsView(financePlanner);
    initBudgetView(financePlanner);
    initMonthlyReportView(financePlanner);
    initCategoryReportView(financePlanner);
    initExportModal(financePlanner);
    initSettingsModal(financePlanner);
    
    // Show dashboard by default
    showView('dashboard-view');
    
    // Load any sample data if no data exists
    if (financePlanner.transactions.length === 0) {
        loadSampleData(financePlanner);
    }
}

// Initialize navigation
function initNavigation(financePlanner) {
    // Dashboard link
    document.getElementById('dashboard-link').addEventListener('click', (e) => {
        e.preventDefault();
        showView('dashboard-view');
        refreshDashboard(financePlanner);
    });
    
    // Add transaction links
    document.getElementById('add-transaction-link').addEventListener('click', (e) => {
        e.preventDefault();
        showView('add-transaction-view');
        resetTransactionForm();
    });
    
    document.getElementById('quick-add-income').addEventListener('click', (e) => {
        e.preventDefault();
        showView('add-transaction-view');
        document.getElementById('transaction-type').value = 'income';
        updateCategoryDropdown(financePlanner, 'income');
        document.getElementById('transaction-amount').focus();
    });
    
    document.getElementById('quick-add-expense').addEventListener('click', (e) => {
        e.preventDefault();
        showView('add-transaction-view');
        document.getElementById('transaction-type').value = 'expense';
        updateCategoryDropdown(financePlanner, 'expense');
        document.getElementById('transaction-amount').focus();
    });
    
    // View transactions link
    document.getElementById('view-transactions-link').addEventListener('click', (e) => {
        e.preventDefault();
        showView('view-transactions-view');
        refreshTransactionsView(financePlanner);
    });
    
    // Budget link
    document.getElementById('budget-link').addEventListener('click', (e) => {
        e.preventDefault();
        showView('budget-view');
        refreshBudgetView(financePlanner);
    });
    
    // Quick view reports
    document.getElementById('quick-view-reports').addEventListener('click', (e) => {
        e.preventDefault();
        showView('monthly-report-view');
        refreshMonthlyReportView(financePlanner);
    });
    
    // Quick set budget
    document.getElementById('quick-set-budget').addEventListener('click', (e) => {
        e.preventDefault();
        showView('budget-view');
        refreshBudgetView(financePlanner);
    });
    
    // Monthly report link
    document.getElementById('monthly-report-link').addEventListener('click', (e) => {
        e.preventDefault();
        showView('monthly-report-view');
        refreshMonthlyReportView(financePlanner);
    });
    
    // Category report link
    document.getElementById('category-report-link').addEventListener('click', (e) => {
        e.preventDefault();
        showView('category-report-view');
        refreshCategoryReportView(financePlanner);
    });
    
    // Export data button
    document.getElementById('export-data-btn').addEventListener('click', (e) => {
        e.preventDefault();
        const exportModal = new bootstrap.Modal(document.getElementById('exportModal'));
        exportModal.show();
    });
    
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', (e) => {
        e.preventDefault();
        const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
        settingsModal.show();
        refreshSettingsModal(financePlanner);
    });
}

// Initialize dashboard
function initDashboard(financePlanner) {
    // Set current date as default in date inputs
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transaction-date').value = today;
    
    // Initial dashboard refresh
    refreshDashboard(financePlanner);
}

// Refresh dashboard data
function refreshDashboard(financePlanner) {
    const summary = financePlanner.getSummary();
    
    // Update summary cards
    document.getElementById('total-income').textContent = financePlanner.formatCurrency(summary.income);
    document.getElementById('total-expenses').textContent = financePlanner.formatCurrency(summary.expenses);
    document.getElementById('current-balance').textContent = financePlanner.formatCurrency(summary.balance);
    
    // Update recent transactions table
    const recentTransactionsTable = document.getElementById('recent-transactions-table').querySelector('tbody');
    recentTransactionsTable.innerHTML = '';
    
    summary.recentTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(transaction.date).toLocaleDateString()}</td>
            <td>${transaction.description || '-'}</td>
            <td>${transaction.category}</td>
            <td class="${transaction.type === 'income' ? 'income-amount' : 'expense-amount'}">
                ${transaction.type === 'income' ? '+' : '-'}${financePlanner.formatCurrency(transaction.amount)}
            </td>
            <td><span class="badge ${transaction.type === 'income' ? 'badge-income' : 'badge-expense'}">
                ${transaction.type === 'income' ? 'Income' : 'Expense'}
            </span></td>
        `;
        recentTransactionsTable.appendChild(row);
    });
    
    // Update spending chart
    updateSpendingChart(financePlanner, summary.expensesByCategory);
}

// Update spending chart
function updateSpendingChart(financePlanner, expensesByCategory) {
    const ctx = document.getElementById('spendingChart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (financePlanner.spendingChart) {
        financePlanner.spendingChart.destroy();
    }
    
    const labels = expensesByCategory.map(item => item.category);
    const data = expensesByCategory.map(item => item.total);
    const backgroundColors = generateColors(labels.length);
    
    financePlanner.spendingChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${financePlanner.formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Initialize transaction form
function initTransactionForm(financePlanner) {
    const form = document.getElementById('transaction-form');
    const transactionType = document.getElementById('transaction-type');
    const recurringCheckbox = document.getElementById('recurring-transaction');
    
    // Update category dropdown when transaction type changes
    transactionType.addEventListener('change', () => {
        const type = transactionType.value;
        updateCategoryDropdown(financePlanner, type);
    });
    
    // Show/hide recurring options
    recurringCheckbox.addEventListener('change', () => {
        document.getElementById('recurring-options').style.display = 
            recurringCheckbox.checked ? 'block' : 'none';
    });
    
    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const type = document.getElementById('transaction-type').value;
        const date = document.getElementById('transaction-date').value;
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const category = document.getElementById('transaction-category').value;
        const description = document.getElementById('transaction-description').value;
        const isRecurring = document.getElementById('recurring-transaction').checked;
        
        // Basic validation
        if (!type || !date || isNaN(amount) || amount <= 0 || !category) {
            alert('Please fill in all required fields with valid values.');
            return;
        }
        
        // Create transaction object
        const transaction = {
            type,
            date,
            amount,
            category,
            description: description || undefined
        };
        
        // Handle recurring transactions if needed
        if (isRecurring) {
            const frequency = document.getElementById('recurring-frequency').value;
            const endDate = document.getElementById('recurring-end-date').value || undefined;
            const iterations = document.getElementById('recurring-iterations').value || undefined;
            
            transaction.recurring = {
                frequency,
                endDate,
                iterations: iterations ? parseInt(iterations) : undefined
            };
        }
        
        // Add the transaction
        financePlanner.addTransaction(transaction);
        
        // Reset form and show success message
        resetTransactionForm();
        showView('dashboard-view');
        refreshDashboard(financePlanner);
        
        // Show success alert
        const alertMessage = `Successfully added ${type} of ${financePlanner.formatCurrency(amount)}`;
        showToast(alertMessage, 'success');
    });
    
    // Cancel button
    document.getElementById('cancel-transaction').addEventListener('click', () => {
        resetTransactionForm();
        showView('dashboard-view');
    });
}

// Reset transaction form
function resetTransactionForm() {
    document.getElementById('transaction-form').reset();
    document.getElementById('recurring-options').style.display = 'none';
    document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
}

// Update category dropdown based on transaction type
function updateCategoryDropdown(financePlanner, type) {
    const categorySelect = document.getElementById('transaction-category');
    categorySelect.innerHTML = '<option value="">Select category</option>';
    
    const categories = type === 'income' 
        ? financePlanner.settings.incomeCategories 
        : financePlanner.settings.expenseCategories;
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

// Initialize transactions view
function initTransactionsView(financePlanner) {
    // Month filter
    document.getElementById('transactions-filter-month').addEventListener('change', () => {
        refreshTransactionsView(financePlanner);
    });
    
    // Type filter
    document.getElementById('transactions-filter-type').addEventListener('change', () => {
        refreshTransactionsView(financePlanner);
    });
    
    // Category filter
    document.getElementById('transactions-filter-category').addEventListener('change', () => {
        refreshTransactionsView(financePlanner);
    });
}

// Refresh transactions view
function refreshTransactionsView(financePlanner) {
    const monthFilter = document.getElementById('transactions-filter-month').value;
    const typeFilter = document.getElementById('transactions-filter-type').value;
    const categoryFilter = document.getElementById('transactions-filter-category').value;
    
    // Get filtered transactions
    let filter = {};
    
    if (monthFilter === 'current') {
        const now = new Date();
        filter.month = now.getMonth();
        filter.year = now.getFullYear();
    } else if (monthFilter !== 'all') {
        // Handle specific month selection if implemented
    }
    
    if (typeFilter !== 'all') {
        filter.type = typeFilter;
    }
    
    if (categoryFilter !== 'all') {
        filter.category = categoryFilter;
    }
    
    const transactions = financePlanner.getTransactions(filter);
    
    // Update category dropdown in filter
    updateCategoryFilterDropdown(financePlanner, typeFilter);
    
    // Update transactions table
    const transactionsTable = document.getElementById('all-transactions-table').querySelector('tbody');
    transactionsTable.innerHTML = '';
    
    if (transactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" class="text-center py-4">No transactions found</td>`;
        transactionsTable.appendChild(row);
    } else {
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td>${transaction.description || '-'}</td>
                <td>${transaction.category}</td>
                <td class="${transaction.type === 'income' ? 'income-amount' : 'expense-amount'}">
                    ${transaction.type === 'income' ? '+' : '-'}${financePlanner.formatCurrency(transaction.amount)}
                </td>
                <td><span class="badge ${transaction.type === 'income' ? 'badge-income' : 'badge-expense'}">
                    ${transaction.type === 'income' ? 'Income' : 'Expense'}
                </span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-transaction" data-id="${transaction.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-transaction" data-id="${transaction.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            transactionsTable.appendChild(row);
        });
        
        // Add event listeners to edit/delete buttons
        document.querySelectorAll('.edit-transaction').forEach(btn => {
            btn.addEventListener('click', () => editTransaction(financePlanner, btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-transaction').forEach(btn => {
            btn.addEventListener('click', () => deleteTransaction(financePlanner, btn.dataset.id));
        });
    }
}

// Update category filter dropdown
function updateCategoryFilterDropdown(financePlanner, typeFilter) {
    const categorySelect = document.getElementById('transactions-filter-category');
    const currentValue = categorySelect.value;
    
    categorySelect.innerHTML = '<option value="all">All Categories</option>';
    
    let categories = [];
    if (typeFilter === 'income' || typeFilter === 'all') {
        categories = categories.concat(financePlanner.settings.incomeCategories);
    }
    if (typeFilter === 'expense' || typeFilter === 'all') {
        categories = categories.concat(financePlanner.settings.expenseCategories);
    }
    
    // Remove duplicates and sort
    categories = [...new Set(categories)].sort();
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
    
    // Restore previous selection if still available
    if (categories.includes(currentValue)) {
        categorySelect.value = currentValue;
    }
}

// Edit transaction
function editTransaction(financePlanner, id) {
    const transaction = financePlanner.transactions.find(t => t.id === id);
    if (!transaction) return;
    
    // Show the add transaction view
    showView('add-transaction-view');
    
    // Populate the form
    document.getElementById('transaction-type').value = transaction.type;
    document.getElementById('transaction-date').value = transaction.date;
    document.getElementById('transaction-amount').value = transaction.amount;
    document.getElementById('transaction-description').value = transaction.description || '';
    
    // Update category dropdown
    updateCategoryDropdown(financePlanner, transaction.type);
    setTimeout(() => {
        document.getElementById('transaction-category').value = transaction.category;
    }, 0);
    
    // Change form to update mode
    const form = document.getElementById('transaction-form');
    form.dataset.editMode = 'true';
    form.dataset.editId = id;
    
    // Change submit button text
    form.querySelector('button[type="submit"]').textContent = 'Update Transaction';
    
    // Remove existing submit listener
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Add new submit listener for update
    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const type = document.getElementById('transaction-type').value;
        const date = document.getElementById('transaction-date').value;
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const category = document.getElementById('transaction-category').value;
        const description = document.getElementById('transaction-description').value;
        
        // Basic validation
        if (!type || !date || isNaN(amount) || amount <= 0 || !category) {
            alert('Please fill in all required fields with valid values.');
            return;
        }
        
        // Update the transaction
        const updates = {
            type,
            date,
            amount,
            category,
            description: description || undefined
        };
        
        if (financePlanner.updateTransaction(id, updates)) {
            // Reset form and show dashboard
            resetTransactionForm();
            showView('dashboard-view');
            refreshDashboard(financePlanner);
            
            // Show success alert
            showToast('Transaction updated successfully', 'success');
        } else {
            showToast('Failed to update transaction', 'danger');
        }
    });
    
    // Cancel button
    document.getElementById('cancel-transaction').addEventListener('click', () => {
        resetTransactionForm();
        showView('view-transactions-view');
        refreshTransactionsView(financePlanner);
    });
}

// Delete transaction
function deleteTransaction(financePlanner, id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        if (financePlanner.deleteTransaction(id)) {
            refreshTransactionsView(financePlanner);
            refreshDashboard(financePlanner);
            showToast('Transaction deleted successfully', 'success');
        } else {
            showToast('Failed to delete transaction', 'danger');
        }
    }
}

// Initialize budget view
// Initialize budget view
function initBudgetView(financePlanner) {
    // Budget form submission
    document.getElementById('budget-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const category = document.getElementById('budget-category').value;
        const amount = parseFloat(document.getElementById('budget-amount').value);
        
        if (!category || isNaN(amount) || amount <= 0) {
            alert('Please select a category and enter a valid amount.');
            return;
        }
        
        financePlanner.setBudget(category, amount);
        document.getElementById('budget-form').reset();
        refreshBudgetView(financePlanner);
        showToast(`Budget set for ${category}`, 'success');
    });
    
    // Initial refresh
    refreshBudgetView(financePlanner);
}

// Refresh budget view
function refreshBudgetView(financePlanner) {
    const now = new Date();
    const budgetSummary = financePlanner.getBudgetSummary(now.getMonth(), now.getFullYear());
    
    // Update category dropdown in budget form
    const categorySelect = document.getElementById('budget-category');
    categorySelect.innerHTML = '<option value="">Select category</option>';
    
    financePlanner.settings.expenseCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
    
    // Update budget summary table
    const budgetTable = document.getElementById('budget-summary-table').querySelector('tbody');
    budgetTable.innerHTML = '';
    
    if (budgetSummary.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" class="text-center py-4">No budgets set</td>`;
        budgetTable.appendChild(row);
    } else {
        budgetSummary.forEach(budget => {
            const row = document.createElement('tr');
            const percentage = (budget.spent / budget.budget) * 100;
            const isOver = percentage > 100;
            
            row.innerHTML = `
                <td>${budget.category}</td>
                <td>${financePlanner.formatCurrency(budget.budget)}</td>
                <td>${financePlanner.formatCurrency(budget.spent)}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1" style="height: 20px;">
                            <div class="progress-bar ${isOver ? 'bg-danger' : 'bg-success'}" 
                                 role="progressbar" 
                                 style="width: ${Math.min(percentage, 100)}%" 
                                 aria-valuenow="${percentage}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                            </div>
                            ${isOver ? `
                            <div class="progress-bar-over" 
                                 style="width: ${percentage - 100}%">
                            </div>
                            ` : ''}
                        </div>
                        <small class="ms-2">${Math.round(percentage)}%</small>
                    </div>
                </td>
            `;
            budgetTable.appendChild(row);
        });
    }
    
    // Update budget chart
    updateBudgetChart(financePlanner, budgetSummary);
}

// Update budget chart
function updateBudgetChart(financePlanner, budgetSummary) {
    const ctx = document.getElementById('budgetChart').getContext('2d');
    
    // Destroy previous chart if it exists
    if (financePlanner.budgetChart) {
        financePlanner.budgetChart.destroy();
    }
    
    const labels = budgetSummary.map(item => item.category);
    const budgetData = budgetSummary.map(item => item.budget);
    const spentData = budgetSummary.map(item => item.spent);
    
    financePlanner.budgetChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Budget',
                    data: budgetData,
                    backgroundColor: 'rgba(78, 115, 223, 0.5)',
                    borderColor: 'rgba(78, 115, 223, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Spent',
                    data: spentData,
                    backgroundColor: 'rgba(231, 74, 59, 0.5)',
                    borderColor: 'rgba(231, 74, 59, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return financePlanner.formatCurrency(value);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${financePlanner.formatCurrency(value)}`;
                        }
                    }
                }
            }
        }
    });
}

// Initialize monthly report view
function initMonthlyReportView(financePlanner) {
    // Month selection change
    document.getElementById('report-month-select').addEventListener('change', () => {
        refreshMonthlyReportView(financePlanner);
    });
    
    // Initial refresh
    refreshMonthlyReportView(financePlanner);
}

// Refresh monthly report view
function refreshMonthlyReportView(financePlanner) {
    const monthSelect = document.getElementById('report-month-select');
    
    // Populate month dropdown if empty
    if (monthSelect.options.length <= 1) {
        const monthlySummaries = financePlanner.getMonthlySummaries();
        
        // Clear existing options except the first one
        while (monthSelect.options.length > 1) {
            monthSelect.remove(1);
        }
        
        // Add options for each month with data
        monthlySummaries.forEach(summary => {
            const date = new Date(summary.year, summary.month, 1);
            const option = document.createElement('option');
            option.value = `${summary.year}-${summary.month}`;
            option.textContent = date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
            
            // Select current month by default
            const now = new Date();
            if (summary.month === now.getMonth() && summary.year === now.getFullYear()) {
                option.selected = true;
            }
            
            monthSelect.appendChild(option);
        });
    }
    
    // Get selected month and year
    const selectedOption = monthSelect.options[monthSelect.selectedIndex].value;
    const [year, month] = selectedOption.split('-').map(Number);
    
    // Get transactions for selected month
    const transactions = financePlanner.getTransactions({ month, year });
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    // Calculate totals
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    
    // Update summary cards
    document.getElementById('report-total-income').textContent = financePlanner.formatCurrency(totalIncome);
    document.getElementById('report-total-expenses').textContent = financePlanner.formatCurrency(totalExpenses);
    document.getElementById('report-net-savings').textContent = financePlanner.formatCurrency(netSavings);
    
    // Update transactions table
    const transactionsTable = document.getElementById('monthly-transactions-table').querySelector('tbody');
    transactionsTable.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(transaction.date).toLocaleDateString()}</td>
            <td>${transaction.description || '-'}</td>
            <td>${transaction.category}</td>
            <td class="${transaction.type === 'income' ? 'income-amount' : 'expense-amount'}">
                ${transaction.type === 'income' ? '+' : '-'}${financePlanner.formatCurrency(transaction.amount)}
            </td>
            <td><span class="badge ${transaction.type === 'income' ? 'badge-income' : 'badge-expense'}">
                ${transaction.type === 'income' ? 'Income' : 'Expense'}
            </span></td>
        `;
        transactionsTable.appendChild(row);
    });
    
    // Update income and expense charts
    updateIncomeChart(financePlanner, incomeTransactions);
    updateExpenseChart(financePlanner, expenseTransactions);
}

// Update income chart
function updateIncomeChart(financePlanner, incomeTransactions) {
    const ctx = document.getElementById('incomeChart').getContext('2d');
    
    // Group income by category
    const incomeByCategory = {};
    incomeTransactions.forEach(t => {
        if (!incomeByCategory[t.category]) {
            incomeByCategory[t.category] = 0;
        }
        incomeByCategory[t.category] += t.amount;
    });
    
    const labels = Object.keys(incomeByCategory);
    const data = Object.values(incomeByCategory);
    const backgroundColors = generateColors(labels.length);
    
    // Destroy previous chart if it exists
    if (financePlanner.incomeChart) {
        financePlanner.incomeChart.destroy();
    }
    
    financePlanner.incomeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${financePlanner.formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update expense chart
function updateExpenseChart(financePlanner, expenseTransactions) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    // Group expenses by category
    const expenseByCategory = {};
    expenseTransactions.forEach(t => {
        if (!expenseByCategory[t.category]) {
            expenseByCategory[t.category] = 0;
        }
        expenseByCategory[t.category] += t.amount;
    });
    
    const labels = Object.keys(expenseByCategory);
    const data = Object.values(expenseByCategory);
    const backgroundColors = generateColors(labels.length);
    
    // Destroy previous chart if it exists
    if (financePlanner.expenseChart) {
        financePlanner.expenseChart.destroy();
    }
    
    financePlanner.expenseChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${financePlanner.formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Initialize category report view
function initCategoryReportView(financePlanner) {
    // Report type change
    document.getElementById('category-report-type').addEventListener('change', () => {
        refreshCategoryReportView(financePlanner);
    });
    
    // Period change
    document.getElementById('category-report-period').addEventListener('change', () => {
        refreshCategoryReportView(financePlanner);
    });
    
    // Initial refresh
    refreshCategoryReportView(financePlanner);
}

// Refresh category report view
function refreshCategoryReportView(financePlanner) {
    const type = document.getElementById('category-report-type').value;
    const period = document.getElementById('category-report-period').value;
    
    const analysis = financePlanner.getCategoryAnalysis(type, period);
    
    // Update category distribution chart
    updateCategoryChart(financePlanner, analysis);
    
    // Update top categories table
    const topCategoriesTable = document.getElementById('top-categories-table').querySelector('tbody');
    topCategoriesTable.innerHTML = '';
    
    analysis.categories.forEach(category => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${category.category}</td>
            <td>${financePlanner.formatCurrency(category.total)}</td>
            <td>${category.percentage.toFixed(1)}%</td>
        `;
        topCategoriesTable.appendChild(row);
    });
    
    // Update trend chart with the first category
    if (analysis.categories.length > 0) {
        updateCategoryTrendChart(financePlanner, analysis.categories[0].category, type);
    }
}

// Update category chart
function updateCategoryChart(financePlanner, analysis) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Prepare data
    const labels = analysis.categories.map(item => item.category);
    const data = analysis.categories.map(item => item.total);
    const backgroundColors = generateColors(labels.length);
    
    // Destroy previous chart if it exists
    if (financePlanner.categoryChart) {
        financePlanner.categoryChart.destroy();
    }
    
    financePlanner.categoryChart = new Chart(ctx, {
        type: analysis.categories.length > 5 ? 'bar' : 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: analysis.categories.length > 5 ? 'top' : 'right',
                },
                title: {
                    display: true,
                    text: `${analysis.type === 'income' ? 'Income' : 'Expenses'} by Category`,
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${financePlanner.formatCurrency(value)} (${context.dataset.data[context.dataIndex] / analysis.grandTotal * 100}%)`;
                        }
                    }
                }
            },
            scales: analysis.categories.length > 5 ? {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return financePlanner.formatCurrency(value);
                        }
                    }
                }
            } : undefined
        }
    });
}

// Update category trend chart
function updateCategoryTrendChart(financePlanner, category, type) {
    const ctx = document.getElementById('categoryTrendChart').getContext('2d');
    const trendData = financePlanner.getCategoryTrends(category, type);
    
    // Destroy previous chart if it exists
    if (financePlanner.categoryTrendChart) {
        financePlanner.categoryTrendChart.destroy();
    }
    
    financePlanner.categoryTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.map(item => item.month),
            datasets: [{
                label: `${category} (${type})`,
                data: trendData.map(item => item.total),
                backgroundColor: 'rgba(78, 115, 223, 0.1)',
                borderColor: 'rgba(78, 115, 223, 1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `${category} Trend Over Time`,
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${financePlanner.formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return financePlanner.formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Initialize export modal
function initExportModal(financePlanner) {
    // Date range change
    document.getElementById('export-date-range').addEventListener('change', (e) => {
        document.getElementById('custom-date-range').style.display = 
            e.target.value === 'custom' ? 'flex' : 'none';
    });
    
    // Export confirmation button
    document.getElementById('export-confirm-btn').addEventListener('click', () => {
        const format = document.getElementById('export-format').value;
        const dateRange = document.getElementById('export-date-range').value;
        const content = document.getElementById('export-content').value;
        
        // Prepare options
        const options = {
            content,
            dateRange: {}
        };
        
        // Set date range based on selection
        const now = new Date();
        switch (dateRange) {
            case 'current-month':
                options.dateRange.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                options.dateRange.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last-month':
                options.dateRange.startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                options.dateRange.endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'last-3-months':
                options.dateRange.startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                options.dateRange.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last-6-months':
                options.dateRange.startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                options.dateRange.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'current-year':
                options.dateRange.startDate = new Date(now.getFullYear(), 0, 1);
                options.dateRange.endDate = new Date(now.getFullYear(), 11, 31);
                break;
            case 'custom':
                const startDate = document.getElementById('export-start-date').value;
                const endDate = document.getElementById('export-end-date').value;
                if (!startDate || !endDate) {
                    alert('Please select both start and end dates for custom range.');
                    return;
                }
                options.dateRange.startDate = new Date(startDate);
                options.dateRange.endDate = new Date(endDate);
                break;
            case 'all':
                // No date range needed
                break;
        }
        
        // Perform export
        try {
            financePlanner.exportData(format, options);
            
            // Close modal
            const exportModal = bootstrap.Modal.getInstance(document.getElementById('exportModal'));
            exportModal.hide();
            
            showToast('Export completed successfully', 'success');
        } catch (error) {
            showToast(`Export failed: ${error.message}`, 'danger');
        }
    });
}

// Initialize settings modal
function initSettingsModal(financePlanner) {
    // Add income category
    document.getElementById('add-income-category').addEventListener('click', () => {
        const newCategory = document.getElementById('new-income-category').value.trim();
        if (newCategory && !financePlanner.settings.incomeCategories.includes(newCategory)) {
            financePlanner.settings.incomeCategories.push(newCategory);
            financePlanner.settings.incomeCategories.sort();
            financePlanner.saveData();
            document.getElementById('new-income-category').value = '';
            refreshSettingsModal(financePlanner);
            showToast('Income category added', 'success');
        }
    });
    
    // Add expense category
    document.getElementById('add-expense-category').addEventListener('click', () => {
        const newCategory = document.getElementById('new-expense-category').value.trim();
        if (newCategory && !financePlanner.settings.expenseCategories.includes(newCategory)) {
            financePlanner.settings.expenseCategories.push(newCategory);
            financePlanner.settings.expenseCategories.sort();
            financePlanner.saveData();
            document.getElementById('new-expense-category').value = '';
            refreshSettingsModal(financePlanner);
            showToast('Expense category added', 'success');
        }
    });
    
    // Save settings
    document.getElementById('save-settings-btn').addEventListener('click', () => {
        // General settings
        financePlanner.settings.currencySymbol = document.getElementById('currency-symbol').value;
        financePlanner.settings.firstDayOfWeek = parseInt(document.getElementById('first-day-of-week').value);
        financePlanner.settings.darkMode = document.getElementById('dark-mode').checked;
        
        // Notification settings
        financePlanner.settings.notifications.enabled = document.getElementById('enable-notifications').checked;
        financePlanner.settings.notifications.dailyTime = document.getElementById('notification-time').value;
        financePlanner.settings.notifications.budgetAlerts = document.getElementById('budget-alerts').checked;
        financePlanner.settings.notifications.largeExpenseAlerts = document.getElementById('large-expense-alerts').checked;
        financePlanner.settings.notifications.largeExpenseThreshold = parseFloat(document.getElementById('large-expense-threshold').value) || 100.00;
        
        financePlanner.saveData();
        financePlanner.applySettings();
        
        // Close modal
        const settingsModal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
        settingsModal.hide();
        
        showToast('Settings saved successfully', 'success');
    });
}

// Refresh settings modal
function refreshSettingsModal(financePlanner) {
    // General settings
    document.getElementById('currency-symbol').value = financePlanner.settings.currencySymbol;
    document.getElementById('first-day-of-week').value = financePlanner.settings.firstDayOfWeek;
    document.getElementById('dark-mode').checked = financePlanner.settings.darkMode;
    
    // Notification settings
    document.getElementById('enable-notifications').checked = financePlanner.settings.notifications.enabled;
    document.getElementById('notification-time').value = financePlanner.settings.notifications.dailyTime;
    document.getElementById('budget-alerts').checked = financePlanner.settings.notifications.budgetAlerts;
    document.getElementById('large-expense-alerts').checked = financePlanner.settings.notifications.largeExpenseAlerts;
    document.getElementById('large-expense-threshold').value = financePlanner.settings.notifications.largeExpenseThreshold;
    
    // Income categories
    const incomeCategoriesList = document.getElementById('income-categories-list');
    incomeCategoriesList.innerHTML = '';
    
    financePlanner.settings.incomeCategories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
            <span>${category}</span>
            <i class="fas fa-times delete-category" data-type="income" data-category="${category}"></i>
        `;
        incomeCategoriesList.appendChild(item);
    });
    
    // Expense categories
    const expenseCategoriesList = document.getElementById('expense-categories-list');
    expenseCategoriesList.innerHTML = '';
    
    financePlanner.settings.expenseCategories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
            <span>${category}</span>
            <i class="fas fa-times delete-category" data-type="expense" data-category="${category}"></i>
        `;
        expenseCategoriesList.appendChild(item);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-category').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            const category = this.dataset.category;
            
            if (confirm(`Are you sure you want to delete the "${category}" ${type} category?`)) {
                if (type === 'income') {
                    const index = financePlanner.settings.incomeCategories.indexOf(category);
                    if (index !== -1) {
                        financePlanner.settings.incomeCategories.splice(index, 1);
                    }
                } else {
                    const index = financePlanner.settings.expenseCategories.indexOf(category);
                    if (index !== -1) {
                        financePlanner.settings.expenseCategories.splice(index, 1);
                    }
                }
                
                financePlanner.saveData();
                refreshSettingsModal(financePlanner);
                showToast('Category deleted', 'success');
            }
        });
    });
}

// Show a specific view and hide others
function showView(viewId) {
    // Hide all views
    document.querySelectorAll('[id$="-view"]').forEach(view => {
        view.classList.add('d-none');
    });
    
    // Show the requested view
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.remove('d-none');
        view.classList.add('view-transition');
        
        // Remove transition class after animation completes
        setTimeout(() => {
            view.classList.remove('view-transition');
        }, 300);
    }
}

// Show a toast notification
function showToast(message, type = 'info') {
    // In a real app, you might use a proper toast library
    alert(`${type.toUpperCase()}: ${message}`);
}

// Generate random colors for charts
function generateColors(count) {
    const colors = [];
    const hueStep = 360 / count;
    
    for (let i = 0; i < count; i++) {
        const hue = i * hueStep;
        colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
    }
    
    return colors;
}

// Load sample data if no data exists
function loadSampleData(financePlanner) {
    if (confirm('Would you like to load sample data to get started?')) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Sample income transactions
        financePlanner.addTransaction({
            type: 'income',
            date: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
            amount: 3000,
            category: 'Salary',
            description: 'Monthly salary'
        });
        
        financePlanner.addTransaction({
            type: 'income',
            date: new Date(currentYear, currentMonth, 15).toISOString().split('T')[0],
            amount: 500,
            category: 'Freelance',
            description: 'Website project'
        });
        
        // Sample expense transactions
        financePlanner.addTransaction({
            type: 'expense',
            date: new Date(currentYear, currentMonth, 2).toISOString().split('T')[0],
            amount: 1200,
            category: 'Rent',
            description: 'Apartment rent'
        });
        
        financePlanner.addTransaction({
            type: 'expense',
            date: new Date(currentYear, currentMonth, 5).toISOString().split('T')[0],
            amount: 350,
            category: 'Food',
            description: 'Groceries'
        });
        
        financePlanner.addTransaction({
            type: 'expense',
            date: new Date(currentYear, currentMonth, 10).toISOString().split('T')[0],
            amount: 80,
            category: 'Transportation',
            description: 'Monthly bus pass'
        });
        
        financePlanner.addTransaction({
            type: 'expense',
            date: new Date(currentYear, currentMonth, 12).toISOString().split('T')[0],
            amount: 150,
            category: 'Entertainment',
            description: 'Movie tickets and dinner'
        });
        
        // Sample budgets
        financePlanner.setBudget('Rent', 1200);
        financePlanner.setBudget('Food', 400);
        financePlanner.setBudget('Transportation', 100);
        financePlanner.setBudget('Entertainment', 200);
        
        // Refresh all views
        refreshDashboard(financePlanner);
        refreshTransactionsView(financePlanner);
        refreshBudgetView(financePlanner);
        refreshMonthlyReportView(financePlanner);
        refreshCategoryReportView(financePlanner);
        
        showToast('Sample data loaded successfully', 'success');
    }
}
function exportChart() {
  const chart = Highcharts.charts[0]; // Replace with your chart variable if different
  const exportFormat = document.querySelector('input[name="export-format"]:checked')?.value;
  const exportCategory = document.querySelector('#export-category').value;

  if (!exportFormat) {
    alert("Please select an export format (PNG/JPEG/PDF)!");
    return;
  }
  if (!exportCategory) {
    alert("Please select a category to export!");
    return;
  }

  chart.exportChart({
    type: exportFormat,
    filename: `Chart_${exportCategory}_${new Date().toISOString()}`
  });
}
