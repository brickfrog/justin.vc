create table employees (
    id integer primary key,
    name varchar(50),
    city varchar(50),
    department varchar(50),
    salary integer
);

insert into employees
(id, name, city, department, salary)
values
(11, 'Diane', 'London', 'HR', 70),
(12, 'Bob', 'London', 'HR', 78),
(21, 'Emma', 'London', 'IT', 84),
(22, 'Grace', 'Berlin', 'IT', 90),
(23, 'Henry', 'London', 'IT', 104),
(24, 'Irene', 'Berlin', 'IT', 104),
(25, 'Frank', 'Berlin', 'IT', 120),
(31, 'Cindy', 'Berlin', 'Sales', 96),
(32, 'Dave', 'London', 'Sales', 96),
(33, 'Alice', 'Berlin', 'Sales', 100),
(34, 'Bob', 'London', 'HR', 70),
(35, 'Alice', 'New York', 'IT', 85),
(36, 'Charlie', 'Paris', 'Sales', 90),
(37, 'David', 'Los Angeles', 'HR', 75),
(38, 'Eve', 'San Francisco', 'IT', 80),
(39, 'Frank', 'Sydney', 'Sales', 95),
(40, 'Grace', 'Tokyo', 'HR', 70),
(41, 'Henry', 'Dubai', 'IT', 85),
(42, 'Isabella', 'Moscow', 'Sales', 90),
(43, 'John', 'Berlin', 'HR', 75);

create table expenses (
    year integer,
    month integer,
    income integer,
    expense integer
);

insert into expenses
(year, month, income, expense)
values
(2020, 1, 94, 82),
(2020, 2, 94, 75),
(2020, 3, 94, 104),
(2020, 4, 100, 94),
(2020, 5, 100, 99),
(2020, 6, 100, 105),
(2020, 7, 100, 95),
(2020, 8, 100, 110),
(2020, 9, 104, 104);