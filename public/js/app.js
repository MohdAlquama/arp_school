// Sidebar Toggle
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');

const openSidebar = () => {
    sidebar?.classList.add('show');
    sidebarOverlay?.classList.add('show');
};

const closeSidebar = () => {
    sidebar?.classList.remove('show');
    sidebarOverlay?.classList.remove('show');
};

sidebarToggle?.addEventListener('click', () => {
    if (sidebar?.classList.contains('show')) {
        closeSidebar();
    } else {
        openSidebar();
    }
});

sidebarClose?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);


// Revenue Chart
const revenueCanvas = document.getElementById('revenueChart');

if (revenueCanvas) {

    new Chart(revenueCanvas, {

        type: 'line',

        data: {
            labels: ['May', 'June', 'July', 'August', 'September', 'October', 'November'],

            datasets: [{
                label: 'Revenue',
                data: [12000, 19000, 15000, 28000, 22000, 35000, 42000],

                borderColor: '#5D5FEF',
                backgroundColor: 'rgba(93,95,239,0.10)',

                borderWidth: 3,
                fill: true,
                tension: 0.4,

                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#F0F1F5'
                    },
                    ticks: {
                        callback: value => '₹' + value.toLocaleString('en-IN')
                    }
                },

                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }

    });

}


// Order Chart
const orderCanvas = document.getElementById('orderChart');

if (orderCanvas) {

    new Chart(orderCanvas, {

        type: 'doughnut',

        data: {
            labels: ['Completed', 'Pending', 'Processing'],

            datasets: [{
                data: [65, 20, 15],

                backgroundColor: [
                    '#20B777',
                    '#F0AF43',
                    '#5D5FEF'
                ],

                borderWidth: 0,
                hoverOffset: 5
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            cutout: '72%',

            plugins: {
                legend: {
                    display: false
                }
            }
        }

    });

}