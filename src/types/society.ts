export type UserRole = 'master_admin' | 'president' | 'vice_president' | 'treasury_head' | 'secretary' | 'coordinator' | 'supervisor' | 'resident';

export const ROLE_LABELS: Record<UserRole, string> = {
  master_admin: 'Master Administrator',
  president: 'Society President',
  vice_president: 'Society Vice President',
  treasury_head: 'Society Treasury Head',
  secretary: 'Society Secretary',
  coordinator: 'Coordinator',
  supervisor: 'Supervisor',
  resident: 'Resident',
};

export interface Resident {
  id: string;
  name: string;
  houseNo: string;
  laneNo: string;
  mobile: string;
  email?: string;
  familyMembers?: number;
  role: UserRole;
  moveInDate?: string;
  isActive: boolean;
  resident_type?: 'owner' | 'member' | 'tenant';
  owner_id?: string;
}

export interface MaintenanceCollection {
  id: string;
  residentId: string;
  residentName: string;
  houseNo: string;
  amount: number;
  dueAmount: number;
  paidDate?: string;
  month: string;
  year: number;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  paymentMode?: 'cash' | 'upi' | 'bank_transfer' | 'cheque';
  receiptNo?: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  vendor?: string;
  approvedBy?: string;
  receiptUrl?: string;
  notes?: string;
}

export type ExpenseCategory = 
  | 'repair'
  | 'purchase'
  | 'maintenance'
  | 'staff_salary'
  | 'electricity'
  | 'water'
  | 'security'
  | 'gardening'
  | 'cleaning'
  | 'events'
  | 'legal'
  | 'insurance'
  | 'other';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  repair: 'Repair',
  purchase: 'New Purchase',
  maintenance: 'General Maintenance',
  staff_salary: 'Staff Salary',
  electricity: 'Electricity',
  water: 'Water Supply',
  security: 'Security',
  gardening: 'Gardening',
  cleaning: 'Cleaning',
  events: 'Events & Functions',
  legal: 'Legal',
  insurance: 'Insurance',
  other: 'Other',
};

export interface Notice {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isActive: boolean;
}

export interface Complaint {
  id: string;
  residentId: string;
  residentName: string;
  houseNo: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  resolvedAt?: string;
  assignedTo?: string;
}
