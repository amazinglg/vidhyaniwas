import { Resident, MaintenanceCollection, Expense, Notice, Complaint } from '@/types/society';

export const mockResidents: Resident[] = [
  { id: '1', name: 'Labhansh Garg', houseNo: 'A-101', laneNo: '1', mobile: '9826016419', email: 'labhanshgarg.3@gmail.com', familyMembers: 4, role: 'master_admin', moveInDate: '2020-01-15', isActive: true },
  { id: '2', name: 'Rajesh Sharma', houseNo: 'A-102', laneNo: '1', mobile: '9876543210', familyMembers: 3, role: 'president', moveInDate: '2019-06-01', isActive: true },
  { id: '3', name: 'Priya Patel', houseNo: 'A-103', laneNo: '1', mobile: '9876543211', familyMembers: 5, role: 'vice_president', moveInDate: '2018-03-20', isActive: true },
  { id: '4', name: 'Amit Verma', houseNo: 'B-201', laneNo: '2', mobile: '9876543212', familyMembers: 2, role: 'resident', moveInDate: '2021-08-10', isActive: true },
  { id: '5', name: 'Sunita Devi', houseNo: 'B-202', laneNo: '2', mobile: '9876543213', familyMembers: 4, role: 'resident', moveInDate: '2020-11-05', isActive: true },
  { id: '6', name: 'Vikram Singh', houseNo: 'B-203', laneNo: '2', mobile: '9876543214', familyMembers: 3, role: 'coordinator', moveInDate: '2019-01-15', isActive: true },
  { id: '7', name: 'Neha Gupta', houseNo: 'C-301', laneNo: '3', mobile: '9876543215', familyMembers: 2, role: 'resident', moveInDate: '2022-04-01', isActive: true },
  { id: '8', name: 'Ravi Kumar', houseNo: 'C-302', laneNo: '3', mobile: '9876543216', familyMembers: 6, role: 'resident', moveInDate: '2017-09-12', isActive: true },
  { id: '9', name: 'Meena Joshi', houseNo: 'C-303', laneNo: '3', mobile: '9876543217', familyMembers: 3, role: 'resident', moveInDate: '2023-01-20', isActive: true },
  { id: '10', name: 'Deepak Tiwari', houseNo: 'D-401', laneNo: '4', mobile: '9876543218', familyMembers: 4, role: 'resident', moveInDate: '2021-05-15', isActive: true },
];

export const mockCollections: MaintenanceCollection[] = [
  { id: '1', residentId: '1', residentName: 'Labhansh Garg', houseNo: 'A-101', amount: 3000, dueAmount: 0, paidDate: '2024-01-05', month: 'January', year: 2024, status: 'paid', paymentMode: 'upi', receiptNo: 'RCP-001' },
  { id: '2', residentId: '2', residentName: 'Rajesh Sharma', houseNo: 'A-102', amount: 3000, dueAmount: 0, paidDate: '2024-01-08', month: 'January', year: 2024, status: 'paid', paymentMode: 'bank_transfer', receiptNo: 'RCP-002' },
  { id: '3', residentId: '3', residentName: 'Priya Patel', houseNo: 'A-103', amount: 1500, dueAmount: 1500, paidDate: '2024-01-15', month: 'January', year: 2024, status: 'partial', paymentMode: 'cash' },
  { id: '4', residentId: '4', residentName: 'Amit Verma', houseNo: 'B-201', amount: 3000, dueAmount: 0, paidDate: '2024-01-03', month: 'January', year: 2024, status: 'paid', paymentMode: 'upi', receiptNo: 'RCP-004' },
  { id: '5', residentId: '5', residentName: 'Sunita Devi', houseNo: 'B-202', amount: 0, dueAmount: 3000, month: 'January', year: 2024, status: 'overdue' },
  { id: '6', residentId: '6', residentName: 'Vikram Singh', houseNo: 'B-203', amount: 3000, dueAmount: 0, paidDate: '2024-01-10', month: 'January', year: 2024, status: 'paid', paymentMode: 'cheque', receiptNo: 'RCP-006' },
  { id: '7', residentId: '7', residentName: 'Neha Gupta', houseNo: 'C-301', amount: 0, dueAmount: 3000, month: 'January', year: 2024, status: 'pending' },
  { id: '8', residentId: '8', residentName: 'Ravi Kumar', houseNo: 'C-302', amount: 3000, dueAmount: 0, paidDate: '2024-01-12', month: 'January', year: 2024, status: 'paid', paymentMode: 'upi', receiptNo: 'RCP-008' },
  { id: '9', residentId: '1', residentName: 'Labhansh Garg', houseNo: 'A-101', amount: 3000, dueAmount: 0, paidDate: '2024-02-05', month: 'February', year: 2024, status: 'paid', paymentMode: 'upi', receiptNo: 'RCP-009' },
  { id: '10', residentId: '2', residentName: 'Rajesh Sharma', houseNo: 'A-102', amount: 3000, dueAmount: 0, paidDate: '2024-02-07', month: 'February', year: 2024, status: 'paid', paymentMode: 'bank_transfer', receiptNo: 'RCP-010' },
  { id: '11', residentId: '5', residentName: 'Sunita Devi', houseNo: 'B-202', amount: 0, dueAmount: 3000, month: 'February', year: 2024, status: 'overdue' },
  { id: '12', residentId: '3', residentName: 'Priya Patel', houseNo: 'A-103', amount: 3000, dueAmount: 0, paidDate: '2024-02-10', month: 'February', year: 2024, status: 'paid', paymentMode: 'upi', receiptNo: 'RCP-012' },
];

export const mockExpenses: Expense[] = [
  { id: '1', category: 'staff_salary', description: 'Watchman salary - January', amount: 12000, date: '2024-01-31', notes: 'Monthly salary' },
  { id: '2', category: 'cleaning', description: 'Common area cleaning service', amount: 5000, date: '2024-01-15', vendor: 'CleanUp Services' },
  { id: '3', category: 'electricity', description: 'Common area electricity bill', amount: 8500, date: '2024-01-20' },
  { id: '4', category: 'repair', description: 'Water tank repair', amount: 15000, date: '2024-01-25', vendor: 'Sharma Plumbing', approvedBy: 'Rajesh Sharma' },
  { id: '5', category: 'gardening', description: 'Garden maintenance', amount: 3000, date: '2024-02-01', vendor: 'Green Gardens' },
  { id: '6', category: 'staff_salary', description: 'Watchman salary - February', amount: 12000, date: '2024-02-28' },
  { id: '7', category: 'water', description: 'Water tanker - Feb', amount: 4500, date: '2024-02-15' },
  { id: '8', category: 'purchase', description: 'CCTV camera installation', amount: 25000, date: '2024-02-20', vendor: 'SecureTech', approvedBy: 'Labhansh Garg' },
  { id: '9', category: 'security', description: 'Security gate repair', amount: 7000, date: '2024-03-05', vendor: 'Iron Works' },
  { id: '10', category: 'events', description: 'Holi celebration expenses', amount: 10000, date: '2024-03-15', approvedBy: 'Priya Patel' },
  { id: '11', category: 'maintenance', description: 'Lift maintenance service', amount: 6000, date: '2024-03-20', vendor: 'Otis Elevators' },
  { id: '12', category: 'insurance', description: 'Society insurance premium', amount: 20000, date: '2024-01-10', approvedBy: 'Labhansh Garg' },
];

export const mockNotices: Notice[] = [
  { id: '1', title: 'Annual General Meeting', content: 'All residents are requested to attend the AGM on 15th March 2024 at 6 PM in the community hall.', createdBy: 'Labhansh Garg', createdAt: '2024-03-01', priority: 'high', isActive: true },
  { id: '2', title: 'Water Supply Interruption', content: 'Water supply will be interrupted on 20th Feb from 10 AM to 4 PM due to maintenance work.', createdBy: 'Amit Verma', createdAt: '2024-02-18', priority: 'urgent', isActive: true },
  { id: '3', title: 'Holi Celebration', content: 'Society Holi celebration on 25th March. All residents are welcome to join!', createdBy: 'Vikram Singh', createdAt: '2024-03-10', priority: 'medium', isActive: true },
  { id: '4', title: 'Parking Guidelines', content: 'Please park only in designated spots. Visitor parking is available near gate 2.', createdBy: 'Rajesh Sharma', createdAt: '2024-02-01', priority: 'low', isActive: true },
];

export const mockComplaints: Complaint[] = [
  { id: '1', residentId: '5', residentName: 'Sunita Devi', houseNo: 'B-202', title: 'Water leakage', description: 'Water leaking from overhead tank affecting B block.', category: 'Plumbing', status: 'in_progress', createdAt: '2024-02-15', assignedTo: 'Amit Verma' },
  { id: '2', residentId: '7', residentName: 'Neha Gupta', houseNo: 'C-301', title: 'Streetlight not working', description: 'The streetlight near C block entrance is not working for 3 days.', category: 'Electrical', status: 'open', createdAt: '2024-03-01' },
  { id: '3', residentId: '8', residentName: 'Ravi Kumar', houseNo: 'C-302', title: 'Garbage not collected', description: 'Garbage from C block not collected since Monday.', category: 'Cleaning', status: 'resolved', createdAt: '2024-02-20', resolvedAt: '2024-02-22', assignedTo: 'Vikram Singh' },
];
