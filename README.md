voluntr
=======

Database Systems (CS133) Project

Running the Application
-----------------------
1. Start mySQL in the background.

        mysqld

    If you haven't created the database schema yet, then execute the following:

        mysql
        > use test;
        > source sql/populate_test_data.sql

2. Run the server, and provide a secret key to use either as an environment
variable or a command-line parameter.

        node server.js --VOLUNTR_SECRET=dinos
