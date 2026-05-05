import { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'hi';

const translations: Record<string, Record<Lang, string>> = {
  // Common
  'welcome': { en: 'Welcome', hi: 'स्वागत है' },
  'loading': { en: 'Loading...', hi: 'लोड हो रहा है...' },
  'save': { en: 'Save', hi: 'सहेजें' },
  'cancel': { en: 'Cancel', hi: 'रद्द करें' },
  'edit': { en: 'Edit', hi: 'संपादित करें' },
  'delete': { en: 'Delete', hi: 'हटाएं' },
  'update': { en: 'Update', hi: 'अपडेट करें' },
  'add': { en: 'Add', hi: 'जोड़ें' },
  'search': { en: 'Search', hi: 'खोजें' },
  'actions': { en: 'Actions', hi: 'कार्रवाई' },
  'status': { en: 'Status', hi: 'स्थिति' },
  'active': { en: 'Active', hi: 'सक्रिय' },
  'inactive': { en: 'Inactive', hi: 'निष्क्रिय' },
  'date': { en: 'Date', hi: 'तारीख' },
  'amount': { en: 'Amount', hi: 'राशि' },
  'name': { en: 'Name', hi: 'नाम' },
  'mobile': { en: 'Mobile', hi: 'मोबाइल' },
  'email': { en: 'Email', hi: 'ईमेल' },
  'submit': { en: 'Submit', hi: 'जमा करें' },
  'close': { en: 'Close', hi: 'बंद करें' },
  'all': { en: 'All', hi: 'सभी' },
  'yes': { en: 'Yes', hi: 'हाँ' },
  'no': { en: 'No', hi: 'नहीं' },
  'sign_out': { en: 'Sign Out', hi: 'साइन आउट' },
  'change_password': { en: 'Change Password', hi: 'पासवर्ड बदलें' },
  'total': { en: 'Total', hi: 'कुल' },

  // Sidebar & Navigation
  'dashboard': { en: 'Dashboard', hi: 'डैशबोर्ड' },
  'residents': { en: 'Residents', hi: 'निवासी' },
  'maintenance_fund': { en: 'Maintenance Fund', hi: 'रखरखाव निधि' },
  'expenses': { en: 'Expenses', hi: 'खर्चे' },
 'notices': { en: 'Notices & Announcements', hi: 'सूचनाएं और घोषणाएं' },
 'notifications': { en: 'Notifications', hi: 'सूचनाएं' },
 'unread': { en: 'unread', hi: 'अपठित' },
 'mark_all_read': { en: 'Mark all', hi: 'सभी पढ़ा' },
 'no_notifications': { en: 'No notifications yet', hi: 'अभी कोई सूचना नहीं' },
 'all_caught_up': { en: "You're all caught up", hi: 'सब देख लिया' },
  'notices_short': { en: 'Notices', hi: 'सूचनाएं' },
  'manage_complaints': { en: 'Manage Complaints', hi: 'शिकायत प्रबंधन' },
  'settings': { en: 'Settings', hi: 'सेटिंग्स' },
  'my_profile': { en: 'My Profile', hi: 'मेरी प्रोफ़ाइल' },
  'my_complaints': { en: 'My Complaints', hi: 'मेरी शिकायतें' },
  'society_management': { en: 'Society Management', hi: 'सोसायटी प्रबंधन' },

  // Dashboard
  'financial_overview': { en: 'Financial overview of Shri Vidhya Niwas', hi: 'श्री विद्या निवास का वित्तीय अवलोकन' },
  'total_residents': { en: 'Total Residents', hi: 'कुल निवासी' },
  'total_collected': { en: 'Total Collected', hi: 'कुल संग्रह' },
  'total_expenses': { en: 'Total Expenses', hi: 'कुल खर्चे' },
  'pending_dues': { en: 'Pending Dues', hi: 'बकाया राशि' },
  'net_balance': { en: 'Net Balance', hi: 'शुद्ध शेष' },
  'monthly_income_vs_expenses': { en: 'Monthly Income vs Expenses', hi: 'मासिक आय बनाम खर्चे' },
  'expenses_by_category': { en: 'Expenses by Category', hi: 'श्रेणी अनुसार खर्चे' },
  'payments_received': { en: 'payments received', hi: 'भुगतान प्राप्त' },
  'residents_pending': { en: 'residents pending', hi: 'निवासी बकाया' },
  'income': { en: 'Income', hi: 'आय' },
  'expense': { en: 'Expense', hi: 'खर्चा' },
  'no_expenses_yet': { en: 'No expenses recorded yet', hi: 'अभी तक कोई खर्चा दर्ज नहीं' },

  // Residents
  'total_residents_count': { en: 'total residents', hi: 'कुल निवासी' },
  'add_resident': { en: 'Add Resident', hi: 'निवासी जोड़ें' },
  'edit_resident': { en: 'Edit Resident', hi: 'निवासी संपादित करें' },
  'full_name': { en: 'Full Name', hi: 'पूरा नाम' },
  'house_no': { en: 'House No.', hi: 'मकान नं.' },
  'lane_no': { en: 'Lane No.', hi: 'लेन नं.' },
  'lane': { en: 'Lane', hi: 'लेन' },
  'contact': { en: 'Contact', hi: 'संपर्क' },
  'family': { en: 'Family', hi: 'परिवार' },
  'family_members': { en: 'Family Members', hi: 'परिवार के सदस्य' },
  'search_residents': { en: 'Search by name, house no., or mobile...', hi: 'नाम, मकान नं. या मोबाइल से खोजें...' },
  'no_residents_found': { en: 'No residents found. Add your first resident!', hi: 'कोई निवासी नहीं मिला। पहला निवासी जोड़ें!' },

  // Maintenance
  'track_maintenance': { en: 'Track annual maintenance collections', hi: 'वार्षिक रखरखाव संग्रह को ट्रैक करें' },
  'record_payment': { en: 'Record Payment', hi: 'भुगतान दर्ज करें' },
  'paid': { en: 'Paid', hi: 'भुगतान किया' },
  'partial': { en: 'Partial', hi: 'आंशिक' },
  'pending': { en: 'Pending', hi: 'बकाया' },
  'overdue': { en: 'Overdue', hi: 'अतिदेय' },
  'due': { en: 'Due', hi: 'बकाया' },
  'mode': { en: 'Mode', hi: 'माध्यम' },
  'payment_mode': { en: 'Payment Mode', hi: 'भुगतान माध्यम' },
  'receipt_no': { en: 'Receipt No.', hi: 'रसीद नं.' },
  'resident': { en: 'Resident', hi: 'निवासी' },
  'house': { en: 'House', hi: 'मकान' },
  'all_status': { en: 'All Status', hi: 'सभी स्थिति' },
  'all_months': { en: 'All Months', hi: 'सभी महीने' },
  'no_records_found': { en: 'No records found', hi: 'कोई रिकॉर्ड नहीं मिला' },
  'cash': { en: 'Cash', hi: 'नकद' },
  'upi': { en: 'UPI', hi: 'UPI' },
  'bank_transfer': { en: 'Bank Transfer', hi: 'बैंक ट्रांसफर' },
  'cheque': { en: 'Cheque', hi: 'चेक' },
  'select_resident': { en: 'Select resident', hi: 'निवासी चुनें' },
  'payment_recorded': { en: 'Payment recorded', hi: 'भुगतान दर्ज किया गया' },
  'this_month': { en: 'This Month', hi: 'इस महीने' },
  'total_entries': { en: 'Total Entries', hi: 'कुल प्रविष्टियाँ' },
  'your_payment_history': { en: 'Your payment history', hi: 'आपका भुगतान इतिहास' },
  'total_paid': { en: 'Total Paid', hi: 'कुल भुगतान' },
  'total_pending': { en: 'Total Pending', hi: 'कुल बकाया' },
  'no_records': { en: 'No maintenance records found', hi: 'कोई रखरखाव रिकॉर्ड नहीं मिला' },
  'total_maintenance': { en: 'Total Maintenance', hi: 'कुल रखरखाव' },
  'set_default_amount': { en: 'Set Default Amount', hi: 'डिफ़ॉल्ट राशि सेट करें' },
  'default_amount_note': { en: 'This will update the total maintenance for all existing records and recalculate dues.', hi: 'यह सभी मौजूदा रिकॉर्ड के लिए कुल रखरखाव अपडेट करेगा और बकाया की पुनर्गणना करेगा।' },
  'amount_updated': { en: 'Amount updated successfully', hi: 'राशि सफलतापूर्वक अपडेट की गई' },

  // Expenses
  'track_expenses': { en: 'Track all society expenditures', hi: 'सभी सोसायटी खर्चों को ट्रैक करें' },
  'add_expense': { en: 'Add Expense', hi: 'खर्चा जोड़ें' },
  'edit_expense': { en: 'Edit Expense', hi: 'खर्चा संपादित करें' },
  'category': { en: 'Category', hi: 'श्रेणी' },
  'description': { en: 'Description', hi: 'विवरण' },
  'vendor': { en: 'Vendor', hi: 'विक्रेता' },
  'approved_by': { en: 'Approved By', hi: 'द्वारा अनुमोदित' },
  'notes': { en: 'Notes', hi: 'नोट्स' },
  'all_categories': { en: 'All Categories', hi: 'सभी श्रेणियां' },
  'search_expenses': { en: 'Search expenses...', hi: 'खर्चे खोजें...' },
  'no_expenses_found': { en: 'No expenses found', hi: 'कोई खर्चा नहीं मिला' },
  'expense_added': { en: 'Expense added', hi: 'खर्चा जोड़ा गया' },
  'expense_updated': { en: 'Expense updated', hi: 'खर्चा अपडेट किया गया' },
  'expense_deleted': { en: 'Expense deleted', hi: 'खर्चा हटाया गया' },
  'visible': { en: 'Visible', hi: 'दृश्य' },
  'hidden': { en: 'Hidden', hi: 'छिपा हुआ' },

  // Expense categories
  'cat_repair': { en: 'Repair', hi: 'मरम्मत' },
  'cat_purchase': { en: 'New Purchase', hi: 'नई खरीद' },
  'cat_maintenance': { en: 'General Maintenance', hi: 'सामान्य रखरखाव' },
  'cat_staff_salary': { en: 'Staff Salary', hi: 'कर्मचारी वेतन' },
  'cat_electricity': { en: 'Electricity', hi: 'बिजली' },
  'cat_water': { en: 'Water Supply', hi: 'जल आपूर्ति' },
  'cat_security': { en: 'Security', hi: 'सुरक्षा' },
  'cat_gardening': { en: 'Gardening', hi: 'बागवानी' },
  'cat_cleaning': { en: 'Cleaning', hi: 'सफ़ाई' },
  'cat_events': { en: 'Events & Functions', hi: 'कार्यक्रम और समारोह' },
  'cat_legal': { en: 'Legal', hi: 'कानूनी' },
  'cat_insurance': { en: 'Insurance', hi: 'बीमा' },
  'cat_other': { en: 'Other', hi: 'अन्य' },

  // Notices
  'stay_updated': { en: 'Stay updated with society news', hi: 'सोसायटी समाचारों से अपडेट रहें' },
  'new_notice': { en: 'New Notice', hi: 'नई सूचना' },
  'create_notice': { en: 'Create Notice', hi: 'सूचना बनाएं' },
  'title': { en: 'Title', hi: 'शीर्षक' },
  'content': { en: 'Content', hi: 'सामग्री' },
  'priority': { en: 'Priority', hi: 'प्राथमिकता' },
  'low': { en: 'Low', hi: 'कम' },
  'medium': { en: 'Medium', hi: 'मध्यम' },
  'high': { en: 'High', hi: 'उच्च' },
  'urgent': { en: 'Urgent', hi: 'अत्यावश्यक' },
  'publish_notice': { en: 'Publish Notice', hi: 'सूचना प्रकाशित करें' },
  'notice_published': { en: 'Notice published', hi: 'सूचना प्रकाशित की गई' },
  'no_notices': { en: 'No notices yet.', hi: 'अभी कोई सूचना नहीं।' },

  // Complaints
  'review_complaints': { en: 'Review, comment and resolve resident complaints', hi: 'निवासियों की शिकायतों की समीक्षा करें, टिप्पणी करें और समाधान करें' },
  'open': { en: 'Open', hi: 'खुला' },
  'in_progress': { en: 'In Progress', hi: 'प्रगति में' },
  'pending_user_reply': { en: 'Pending Resident Reply', hi: 'निवासी के उत्तर की प्रतीक्षा में' },
  'resolved': { en: 'Resolved', hi: 'समाधान हो गया' },
  'closed': { en: 'Closed', hi: 'बंद' },
  'respond_complaint': { en: 'Respond to Complaint', hi: 'शिकायत का उत्तर दें' },
  'admin_comment': { en: 'Comment / Response', hi: 'टिप्पणी / उत्तर' },
  'send_response': { en: 'Send Response', hi: 'उत्तर भेजें' },
  'no_complaints': { en: 'No complaints', hi: 'कोई शिकायत नहीं' },
  'status_updated': { en: 'Status updated', hi: 'स्थिति अपडेट की गई' },
  'comment_added': { en: 'Comment added', hi: 'टिप्पणी जोड़ी गई' },
  'raise_complaint': { en: 'Raise Complaint', hi: 'शिकायत दर्ज करें' },
  'new_complaint': { en: 'New Complaint', hi: 'नई शिकायत' },
  'submit_complaint': { en: 'Submit a Complaint', hi: 'शिकायत दर्ज करें' },
  'complaint_submitted': { en: 'Complaint submitted', hi: 'शिकायत दर्ज की गई' },
  'no_complaints_submitted': { en: 'No complaints submitted yet.', hi: 'अभी तक कोई शिकायत दर्ज नहीं की गई।' },
  'admin_response': { en: 'Admin Response', hi: 'व्यवस्थापक उत्तर' },
  'track_complaints': { en: 'Track your submitted complaints', hi: 'अपनी दर्ज शिकायतों को ट्रैक करें' },
  'assigned_to': { en: 'Assigned To', hi: 'को सौंपा गया' },
  'add_comment_required': { en: 'Please add a comment before changing status', hi: 'स्थिति बदलने से पहले कृपया टिप्पणी जोड़ें' },
  'status_changed_to': { en: 'Status changed to', hi: 'स्थिति बदली गई' },
  'add_comment_for_status': { en: 'Add Comment for Status Change', hi: 'स्थिति परिवर्तन के लिए टिप्पणी जोड़ें' },
  'changing_status_to': { en: 'Changing status to', hi: 'स्थिति बदल रहे हैं' },
  'add_reason_placeholder': { en: 'Add reason or update for this status change...', hi: 'इस स्थिति परिवर्तन के लिए कारण या अपडेट जोड़ें...' },
  'confirm_status_change': { en: 'Confirm Status Change', hi: 'स्थिति परिवर्तन की पुष्टि करें' },
  'add_comment_placeholder': { en: 'Add a comment...', hi: 'टिप्पणी जोड़ें...' },
  'comment_history': { en: 'Comment History', hi: 'टिप्पणी इतिहास' },

  // Settings
  'master_admin_controls': { en: 'Master Administrator controls', hi: 'मास्टर व्यवस्थापक नियंत्रण' },
  'society_info': { en: 'Society Info', hi: 'सोसायटी जानकारी' },
  'manage_users': { en: 'Manage Users', hi: 'उपयोगकर्ता प्रबंधन' },
  'manage_roles': { en: 'Manage Roles', hi: 'भूमिका प्रबंधन' },
  'change_role': { en: 'Change Role', hi: 'भूमिका बदलें' },
  'reset_password': { en: 'Reset Password', hi: 'पासवर्ड रीसेट करें' },
  'role_updated': { en: 'Role updated', hi: 'भूमिका अपडेट की गई' },
  'select_role': { en: 'Select Role', hi: 'भूमिका चुनें' },
  'update_role': { en: 'Update Role', hi: 'भूमिका अपडेट करें' },
  'available_roles': { en: 'Available Roles', hi: 'उपलब्ध भूमिकाएं' },
  'user_roles_password': { en: 'User Roles & Password Management', hi: 'उपयोगकर्ता भूमिका और पासवर्ड प्रबंधन' },
  'resident_updated': { en: 'Resident updated', hi: 'निवासी अपडेट किया गया' },
  'resident_removed': { en: 'Resident removed', hi: 'निवासी हटाया गया' },
  'save_changes': { en: 'Save Changes', hi: 'बदलाव सहेजें' },
  'edit_society_info': { en: 'Edit Society Info', hi: 'सोसायटी जानकारी संपादित करें' },
  'society_name': { en: 'Society Name', hi: 'सोसायटी का नाम' },
  'total_houses': { en: 'Total Houses', hi: 'कुल मकान' },
  'lanes': { en: 'Lanes', hi: 'लेन' },
  'monthly_maintenance': { en: 'Monthly Maintenance', hi: 'मासिक रखरखाव' },
  'master_admin': { en: 'Master Admin', hi: 'मास्टर व्यवस्थापक' },
  'society_info_updated': { en: 'Society info updated', hi: 'सोसायटी जानकारी अपडेट की गई' },
  'residential_society_mgmt': { en: 'Residential Society Management System', hi: 'आवासीय सोसायटी प्रबंधन प्रणाली' },

  // Roles
  'role_master_admin': { en: 'Master Administrator', hi: 'मास्टर व्यवस्थापक' },
  'role_president': { en: 'Society President', hi: 'सोसायटी अध्यक्ष' },
  'role_vice_president': { en: 'Society Vice President', hi: 'सोसायटी उपाध्यक्ष' },
  'role_treasury_head': { en: 'Society Treasury Head', hi: 'सोसायटी कोषाध्यक्ष' },
  'role_secretary': { en: 'Society Secretary', hi: 'सोसायटी सचिव' },
  'role_coordinator': { en: 'Coordinator', hi: 'समन्वयक' },
  'role_resident': { en: 'Resident', hi: 'निवासी' },
  'role_supervisor': { en: 'Supervisor', hi: 'सुपरवाइज़र' },

  // Auth
  'sign_in': { en: 'Sign In', hi: 'साइन इन' },
  'sign_up': { en: 'Sign Up', hi: 'साइन अप' },
  'mobile_number': { en: 'Mobile Number', hi: 'मोबाइल नंबर' },
  'password': { en: 'Password', hi: 'पासवर्ड' },
  'enter_mobile': { en: 'Enter your mobile number', hi: 'अपना मोबाइल नंबर दर्ज करें' },
  'enter_password': { en: 'Enter your password', hi: 'अपना पासवर्ड दर्ज करें' },
  'signing_in': { en: 'Signing in...', hi: 'साइन इन हो रहा है...' },
  'create_account': { en: 'Create Account', hi: 'खाता बनाएं' },
  'creating_account': { en: 'Creating account...', hi: 'खाता बना रहे हैं...' },
  'auto_link_msg': { en: 'Use your registered mobile number to auto-link your resident profile.', hi: 'अपनी निवासी प्रोफ़ाइल को स्वचालित रूप से लिंक करने के लिए अपना पंजीकृत मोबाइल नंबर उपयोग करें।' },

  // Profile
  'view_update_info': { en: 'View and update your information', hi: 'अपनी जानकारी देखें और अपडेट करें' },
  'profile_updated': { en: 'Profile updated', hi: 'प्रोफ़ाइल अपडेट की गई' },
  'edit_profile': { en: 'Edit Profile', hi: 'प्रोफ़ाइल संपादित करें' },
  'not_set': { en: 'Not set', hi: 'सेट नहीं है' },

  // Change password
  'update_password': { en: 'Update your account password', hi: 'अपना खाता पासवर्ड अपडेट करें' },
  'new_password': { en: 'New Password', hi: 'नया पासवर्ड' },
  'confirm_password': { en: 'Confirm Password', hi: 'पासवर्ड की पुष्टि करें' },
  'password_updated': { en: 'Password updated successfully', hi: 'पासवर्ड सफलतापूर्वक अपडेट किया गया' },
  'updating': { en: 'Updating...', hi: 'अपडेट हो रहा है...' },

  // Misc
  'please_fill_required': { en: 'Please fill required fields', hi: 'कृपया आवश्यक फ़ील्ड भरें' },
  'confirm_delete': { en: 'Are you sure you want to delete this?', hi: 'क्या आप वाकई इसे हटाना चाहते हैं?' },
  'visibility_updated': { en: 'Visibility updated', hi: 'दृश्यता अपडेट की गई' },
  'family_member_details': { en: 'Family Members', hi: 'परिवार के सदस्य' },
  'manage_family_info': { en: 'Add and manage family member details', hi: 'परिवार के सदस्यों की जानकारी जोड़ें और प्रबंधित करें' },
  'no_family_members_added': { en: 'No family members added yet', hi: 'अभी तक कोई परिवार का सदस्य नहीं जोड़ा गया' },
  'relation': { en: 'Relation', hi: 'संबंध' },
  'age': { en: 'Age', hi: 'उम्र' },
  'occupation': { en: 'Occupation', hi: 'व्यवसाय' },
  'vehicles': { en: 'Vehicles', hi: 'वाहन' },
  'vehicle': { en: 'Vehicle', hi: 'वाहन' },
  'manage_vehicle_info': { en: 'Add and manage vehicle details', hi: 'वाहन की जानकारी जोड़ें और प्रबंधित करें' },
  'no_vehicles_added': { en: 'No vehicles added yet', hi: 'अभी तक कोई वाहन नहीं जोड़ा गया' },
  'vehicle_type': { en: 'Vehicle Type', hi: 'वाहन प्रकार' },
  'registration_no': { en: 'Registration No.', hi: 'पंजीकरण नं.' },
  'make_model': { en: 'Make/Model', hi: 'बनावट/मॉडल' },
  'color': { en: 'Color', hi: 'रंग' },
  'role': { en: 'Role', hi: 'भूमिका' },
  'complaints': { en: 'Complaints', hi: 'शिकायतें' },

  // Approvals & Tenants
  'pending_approvals': { en: 'Pending Approvals', hi: 'लंबित अनुमोदन' },
  'no_pending_approvals': { en: 'No pending signups to approve', hi: 'अनुमोदन के लिए कोई लंबित साइनअप नहीं' },
  'approve': { en: 'Approve', hi: 'अनुमोदित करें' },
  'reject': { en: 'Reject', hi: 'अस्वीकार करें' },
  'signup_approved': { en: 'Signup approved', hi: 'साइनअप अनुमोदित' },
  'signup_rejected': { en: 'Signup rejected', hi: 'साइनअप अस्वीकृत' },
  'confirm_reject_signup': { en: 'Are you sure you want to reject this signup?', hi: 'क्या आप वाकई इस साइनअप को अस्वीकार करना चाहते हैं?' },
  'tenants': { en: 'Tenants', hi: 'किराएदार' },
  'view_tenant': { en: 'View Tenant', hi: 'किराएदार देखें' },
  'add_tenant': { en: 'Add Tenant', hi: 'किराएदार जोड़ें' },
  'edit_tenant': { en: 'Edit Tenant', hi: 'किराएदार संपादित करें' },
  'no_tenants': { en: 'No tenants added', hi: 'कोई किराएदार नहीं जोड़ा गया' },
  'tenant_added': { en: 'Tenant added', hi: 'किराएदार जोड़ा गया' },
  'tenant_removed': { en: 'Tenant removed', hi: 'किराएदार हटाया गया' },
  'house_owner': { en: 'House Owner', hi: 'मकान मालिक' },
  'family_member': { en: 'Family Member', hi: 'परिवार का सदस्य' },
  'tenant': { en: 'Tenant', hi: 'किराएदार' },
  'signup_pending_msg': { en: 'Your signup is pending approval from Society management.', hi: 'आपका साइनअप सोसायटी प्रबंधन से अनुमोदन की प्रतीक्षा में है।' },

  // New keys
  'pending_signups': { en: 'Pending Signups', hi: 'लंबित साइनअप' },
  'review_pending_signups': { en: 'Review and approve new user signups', hi: 'नए उपयोगकर्ता साइनअप की समीक्षा और अनुमोदन करें' },
  'withdraw': { en: 'Withdraw', hi: 'वापस लें' },
  'confirm_withdraw_complaint': { en: 'Are you sure you want to withdraw this complaint?', hi: 'क्या आप वाकई इस शिकायत को वापस लेना चाहते हैं?' },
  'complaint_withdrawn': { en: 'Complaint withdrawn', hi: 'शिकायत वापस ली गई' },
  'withdrawn': { en: 'Withdrawn', hi: 'वापस लिया गया' },
  'add_user': { en: 'Add User', hi: 'उपयोगकर्ता जोड़ें' },
  'resident_type': { en: 'Resident Type', hi: 'निवासी प्रकार' },
  'society_mgmt_desc': { en: 'View society management committee members', hi: 'सोसायटी प्रबंधन समिति के सदस्यों को देखें' },
  'no_mgmt_members': { en: 'No management members added yet', hi: 'अभी तक कोई प्रबंधन सदस्य नहीं जोड़ा गया' },
  'role_title': { en: 'Role / Title', hi: 'भूमिका / पद' },
  'photo_url': { en: 'Photo URL', hi: 'फोटो URL' },
  'photo': { en: 'Photo', hi: 'फोटो' },
  'upload_photo': { en: 'Upload Photo', hi: 'फोटो अपलोड करें' },
  'display_order': { en: 'Display Order', hi: 'प्रदर्शन क्रम' },
  'manage_tenant_info': { en: 'Add and manage tenant for your house', hi: 'अपने घर के लिए किराएदार जोड़ें और प्रबंधित करें' },
  'month': { en: 'Month', hi: 'महीना' },
  'notice_deleted': { en: 'Notice deleted', hi: 'सूचना हटाई गई' },
  'select': { en: 'Select', hi: 'चुनें' },
  'due_date': { en: 'Due Date', hi: 'देय तिथि' },
  'due_payment': { en: 'Due Payment', hi: 'बकाया भुगतान' },
  'pay_due': { en: 'Pay Due', hi: 'बकाया भुगतान करें' },
  'due_payment_recorded': { en: 'Due payment recorded', hi: 'बकाया भुगतान दर्ज किया गया' },
  'approved_at': { en: 'Approved At', hi: 'अनुमोदन तिथि' },
  'approval_history': { en: 'Approval History', hi: 'अनुमोदन इतिहास' },
  'send_to': { en: 'Send To', hi: 'भेजें' },
  'all_users': { en: 'All Users', hi: 'सभी उपयोगकर्ता' },
  'admins_only': { en: 'Admins Only', hi: 'केवल व्यवस्थापक' },
  'specific_users': { en: 'Specific Users', hi: 'विशिष्ट उपयोगकर्ता' },
  'select_users': { en: 'Select Users', hi: 'उपयोगकर्ता चुनें' },
  'notification_sent': { en: 'Notification sent', hi: 'सूचना भेजी गई' },

  // Notification banner
  'enable_notifications': { en: 'Enable Notifications', hi: 'सूचनाएं सक्षम करें' },
  'notification_desc': { en: 'Get instant alerts for notices & updates.', hi: 'सूचनाओं और अपडेट के लिए तुरंत अलर्ट प्राप्त करें।' },
  'allow': { en: 'Allow', hi: 'अनुमति दें' },

  // TopBar
  'signed_out': { en: 'Signed out', hi: 'साइन आउट किया गया' },

  // Signup pending
  'signup_pending_title': { en: 'Signup Pending Approval', hi: 'साइनअप अनुमोदन लंबित' },
  'signup_pending_desc': { en: 'Your account is pending approval from Society management. You will be able to login once approved.', hi: 'आपका खाता सोसायटी प्रबंधन से अनुमोदन की प्रतीक्षा में है। अनुमोदित होने के बाद आप लॉगिन कर पाएंगे।' },

  // Receipt
  'download_receipt': { en: 'Download Receipt', hi: 'रसीद डाउनलोड करें' },
  'no_receipts': { en: 'No maintenance receipts found for this resident', hi: 'इस निवासी के लिए कोई रखरखाव रसीद नहीं मिली' },

  // PWA Install
  'install_app': { en: 'Install App', hi: 'ऐप इंस्टॉल करें' },
  'install_app_desc': { en: 'Install this app on your device for quick access', hi: 'त्वरित पहुंच के लिए इस ऐप को अपने डिवाइस पर इंस्टॉल करें' },
  'install': { en: 'Install', hi: 'इंस्टॉल करें' },
  'installing': { en: 'Installing...', hi: 'इंस्टॉल हो रहा है...' },
  'install_app_short': { en: 'One tap install — use like a real app', hi: 'एक टैप में इंस्टॉल करें — असली ऐप की तरह उपयोग करें' },
  'install_ios_msg': { en: 'Tap the Share button (⬆) at the bottom in Safari, then tap "Add to Home Screen"', hi: 'Safari में नीचे Share बटन (⬆) दबाएं, फिर "Add to Home Screen" चुनें' },
  'not_signed_up': { en: 'Not signed up', hi: 'साइनअप नहीं किया' },

  // Hard Refresh
  'hard_refresh': { en: 'Hard Refresh', hi: 'हार्ड रिफ्रेश' },
  'hard_refresh_desc': { en: 'Clear all caches & cookies and reinstall app to the latest version', hi: 'सभी कैश और कुकीज़ साफ़ करें और ऐप को नवीनतम संस्करण में पुनः इंस्टॉल करें' },
  'hard_refresh_confirm': { en: 'This will clear all caches and reinstall the app. You will stay logged in. Continue?', hi: 'यह सभी कैश साफ़ करेगा और ऐप को पुनः इंस्टॉल करेगा। आप लॉग इन रहेंगे। जारी रखें?' },
  'hard_refreshing': { en: 'Refreshing app…', hi: 'ऐप रिफ्रेश हो रहा है…' },
  'hard_refresh_note': { en: 'The app will reload in a moment with the latest version.', hi: 'ऐप कुछ ही पल में नवीनतम संस्करण के साथ पुनः लोड होगा।' },

  // PWA Update prompt
  'app_update_available': { en: 'New app update found', hi: 'नया ऐप अपडेट उपलब्ध' },
  'app_update_ready_msg': { en: 'The latest version is ready. Tap update to load it now.', hi: 'नवीनतम संस्करण तैयार है। अभी लोड करने के लिए अपडेट दबाएं।' },
  'app_updating': { en: 'Updating app…', hi: 'ऐप अपडेट हो रहा है…' },
  'app_updating_msg': { en: 'Clearing caches and loading the latest version.', hi: 'कैश साफ़ कर रहे हैं और नवीनतम संस्करण लोड कर रहे हैं।' },
  'update_now': { en: 'Update now', hi: 'अभी अपडेट करें' },
  'later': { en: 'Later', hi: 'बाद में' },

  // Release updates
  'release_updates': { en: 'Release Updates', hi: 'अपडेट जारी करें' },
  'permissions': { en: 'Permissions', hi: 'अनुमतियां' },
  'permission_matrix': { en: 'Role Permission Matrix', hi: 'भूमिका अनुमति मैट्रिक्स' },
  'permission_matrix_desc': { en: 'Change page view/write access instantly without code changes.', hi: 'कोड बदले बिना पेज देखने/लिखने की अनुमति तुरंत बदलें।' },
  'master_admin_unrestricted': { en: 'Master Admin is always unrestricted', hi: 'मास्टर एडमिन हमेशा पूर्ण अधिकार वाला है' },
  'new_role_placeholder': { en: 'new_role_name', hi: 'नई_भूमिका_नाम' },
  'add_role': { en: 'Add Role', hi: 'भूमिका जोड़ें' },
  'role_added': { en: 'Role added', hi: 'भूमिका जोड़ी गई' },
  'permission_updated': { en: 'Permission updated', hi: 'अनुमति अपडेट हुई' },
  'permission_live_note': { en: 'Changes apply immediately for users on their next navigation/refresh.', hi: 'बदलाव उपयोगकर्ताओं के अगले नेविगेशन/रिफ्रेश पर तुरंत लागू होंगे।' },
  'view': { en: 'View', hi: 'देखें' },
  'write': { en: 'Write', hi: 'लिखें' },
  'device': { en: 'Device', hi: 'डिवाइस' },
  'confirm_complete_user_delete': { en: 'Completely delete this user and linked records? This cannot be undone.', hi: 'इस उपयोगकर्ता और जुड़े रिकॉर्ड पूरी तरह हटाएं? यह वापस नहीं होगा।' },
  'user_deleted_completely': { en: 'User completely deleted', hi: 'उपयोगकर्ता पूरी तरह हटाया गया' },


  // Complaints extra
  'photos_optional': { en: 'Photos (optional)', hi: 'फ़ोटो (वैकल्पिक)' },
  'general': { en: 'General', hi: 'सामान्य' },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'en');

  const handleSetLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem('lang', l);
  };

  const t = (key: string): string => {
    return translations[key]?.[lang] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
