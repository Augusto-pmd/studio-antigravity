# **App Name**: PMD Manager

## Core Features:

- User Role Management: Define and manage user roles (Direction, Supervisor, Administration, Operator) with different access levels.
- Project Management Module: Central module to link expenses, income, contracts, and schedules for each project.
- User Cash Module: Manage individual user cash accounts, supporting ARS/USD currencies, and enforcing mandatory weekly closures. UI to manage and visualize.
- Expense Tracking: Capture expense details with mandatory fields: Project, Date, Supplier, Category, Amount, and Receipt (or automatic internal VAL generation).
- Alerts for Expired Documents: The system checks the safety of suppliers and will block expense submissions and issue red alerts if a supplier's insurance or ART is expired. LLM tool will verify that documents and other files, especially those used as attachments, exist and are the correct file format and file sizes.
- Contract Balance Enforcement: Automatically blocks the allocation of expenses if a contract's balance reaches zero.
- Dashboard Generation: Show an integrated view of operations, administration, and accounting with project costs. Visualizes data such as overall expenses and project completion progress.

## Style Guidelines:

- Primary blue: #26A6DD, reflecting the brand's main color for primary UI elements. This color suggests reliability and clarity.
- Secondary blue: #1B75B8, used for complementary accents and interactive elements. This provides depth without straying from the primary brand identity.
- Dark institutional blue: #004A8E, employed for headers and footers, giving a strong sense of brand presence.
- Interface gray: Scale from #262E34 used for text, menus, and dark backgrounds, ensuring a consistent and professional aesthetic.
- Alert accent: Use yellow from 'Paleta 3' for warnings, drawing user attention without causing alarm. (Specific hex code from Paleta 3 is needed.)
- Font pairing: 'Inter' for body text and 'PT Sans' for headlines. Both are sans-serif, promoting a modern and professional appearance.
- Design: Maintain a clean layout, minimizing clutter and ensuring intuitive navigation for all users.