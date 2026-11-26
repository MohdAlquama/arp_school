class DashboardController {

    static index = async (req, res) => {

        try {

            const stats = [
                {
                    title: 'Total Revenue',
                    value: '₹1,25,000',
                    change: '+12.5%',
                    icon: 'fa-indian-rupee-sign',
                    color: 'primary'
                },
                {
                    title: 'Total Orders',
                    value: '450',
                    change: '+8.2%',
                    icon: 'fa-shopping-cart',
                    color: 'success'
                },
                {
                    title: 'Total Products',
                    value: '250',
                    change: '+5.4%',
                    icon: 'fa-box',
                    color: 'warning'
                },
                {
                    title: 'Total Customers',
                    value: '320',
                    change: '+15.3%',
                    icon: 'fa-users',
                    color: 'info'
                }
            ];

            const orders = [
                {
                    id: '#ORD-1001',
                    customer: 'Rahul Sharma',
                    product: 'Sports Shoes',
                    date: '25 Nov 2026',
                    amount: '₹2,500',
                    status: 'Completed'
                },
                {
                    id: '#ORD-1002',
                    customer: 'Amit Kumar',
                    product: 'Casual Slippers',
                    date: '25 Nov 2026',
                    amount: '₹850',
                    status: 'Pending'
                },
                {
                    id: '#ORD-1003',
                    customer: 'Mohit Singh',
                    product: 'School Shoes',
                    date: '24 Nov 2026',
                    amount: '₹1,200',
                    status: 'Processing'
                }
            ];

            return res.render('dashboard/index', {
                title: 'Dashboard',
                page: 'dashboard',
                stats,
                orders
            });

        } catch (error) {

            console.error('Dashboard Error:', error);

            return res.status(500).send('Internal Server Error');

        }
    };

}

export default DashboardController;