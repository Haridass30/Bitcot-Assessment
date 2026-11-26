-- Sample seed data. Applied once per database (tracked in schema_migrations as "seed:<file>");
-- INSERT IGNORE additionally skips rows whose email already exists.
-- created_at values are staggered so the dashboard's "recently added" list is meaningful.

INSERT IGNORE INTO employees (name, email, department, designation, joining_date, status, created_at, updated_at) VALUES
  ('Aarav Sharma',      'aarav.sharma@bitcot.example',      'Engineering',      'Senior Software Engineer', '2021-03-15', 'ACTIVE',   UTC_TIMESTAMP(3) - INTERVAL 60 DAY, UTC_TIMESTAMP(3) - INTERVAL 60 DAY),
  ('Priya Patel',       'priya.patel@bitcot.example',       'Engineering',      'DevOps Engineer',          '2022-07-01', 'ACTIVE',   UTC_TIMESTAMP(3) - INTERVAL 55 DAY, UTC_TIMESTAMP(3) - INTERVAL 55 DAY),
  ('Michael Johnson',   'michael.johnson@bitcot.example',   'Product',          'Product Manager',          '2020-11-09', 'ACTIVE',   UTC_TIMESTAMP(3) - INTERVAL 50 DAY, UTC_TIMESTAMP(3) - INTERVAL 50 DAY),
  ('Emily Chen',        'emily.chen@bitcot.example',        'Design',           'UI/UX Designer',           '2023-01-16', 'ACTIVE',   UTC_TIMESTAMP(3) - INTERVAL 45 DAY, UTC_TIMESTAMP(3) - INTERVAL 45 DAY),
  ('Rahul Verma',       'rahul.verma@bitcot.example',       'Engineering',      'QA Engineer',              '2022-02-21', 'ON_LEAVE', UTC_TIMESTAMP(3) - INTERVAL 40 DAY, UTC_TIMESTAMP(3) - INTERVAL 40 DAY),
  ('Sophia Martinez',   'sophia.martinez@bitcot.example',   'Marketing',        'Marketing Specialist',     '2021-09-06', 'ACTIVE',   UTC_TIMESTAMP(3) - INTERVAL 35 DAY, UTC_TIMESTAMP(3) - INTERVAL 35 DAY),
  ('David Wilson',      'david.wilson@bitcot.example',      'Sales',            'Account Executive',        '2019-05-13', 'INACTIVE', UTC_TIMESTAMP(3) - INTERVAL 30 DAY, UTC_TIMESTAMP(3) - INTERVAL 30 DAY),
  ('Ananya Iyer',       'ananya.iyer@bitcot.example',       'Human Resources',  'HR Business Partner',      '2020-08-24', 'ACTIVE',   UTC_TIMESTAMP(3) - INTERVAL 25 DAY, UTC_TIMESTAMP(3) - INTERVAL 25 DAY),
  ('James Anderson',    'james.anderson@bitcot.example',    'Finance',          'Financial Analyst',        '2023-04-03', 'ACTIVE',   UTC_TIMESTAMP(3) - INTERVAL 20 DAY, UTC_TIMESTAMP(3) - INTERVAL 20 DAY),
  ('Fatima Khan',       'fatima.khan@bitcot.example',       'Operations',       'Operations Manager',       '2018-10-29', 'ACTIVE',   UTC_TIMESTAMP(3) - INTERVAL 15 DAY, UTC_TIMESTAMP(3) - INTERVAL 15 DAY),
  ('Daniel Kim',        'daniel.kim@bitcot.example',        'Customer Support', 'Support Team Lead',        '2022-12-05', 'ON_LEAVE', UTC_TIMESTAMP(3) - INTERVAL 10 DAY, UTC_TIMESTAMP(3) - INTERVAL 10 DAY),
  ('Olivia Brown',      'olivia.brown@bitcot.example',      'Engineering',      'Frontend Developer',       '2024-02-12', 'ACTIVE',   UTC_TIMESTAMP(3) - INTERVAL 7 DAY,  UTC_TIMESTAMP(3) - INTERVAL 7 DAY),
  ('Vikram Singh',      'vikram.singh@bitcot.example',      'Engineering',      'Cloud Architect',          '2024-06-17', 'ACTIVE',   UTC_TIMESTAMP(3) - INTERVAL 4 DAY,  UTC_TIMESTAMP(3) - INTERVAL 4 DAY),
  ('Grace Lee',         'grace.lee@bitcot.example',         'Product',          'Business Analyst',         '2025-01-06', 'ACTIVE',   UTC_TIMESTAMP(3) - INTERVAL 2 DAY,  UTC_TIMESTAMP(3) - INTERVAL 2 DAY),
  ('Arjun Nair',        'arjun.nair@bitcot.example',        'Sales',            'Sales Development Rep',    '2025-03-10', 'ACTIVE',   UTC_TIMESTAMP(3) - INTERVAL 1 DAY,  UTC_TIMESTAMP(3) - INTERVAL 1 DAY);
