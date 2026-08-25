# Feature modules

One folder per business domain (operations, cash register, customers/KYC, auth).
Each owns its types, data access and domain logic, and stays free of layout so
it can be reused by Worker, Kiosk, Admin and Super Admin.
