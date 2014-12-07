voluntr
=======

Database Systems (CS133) Project

Running the Application
-----------------------
1. Install all dependencies

        npm install --dev

2. Start mySQL in the background.

        mysqld

3. Install grunt, which will handle some common tasks in the app.

        npm install -g grunt-cli

4. Grunt has a number of tasks to simplify development.

    | Task                | What it does |
    | ------------------- | ------------ |
    | `grunt npm-install` | Install backend dependencies. |
    | `grunt bower:install` | Install frontend dependencies. |
    | `grunt schema`      | Regenerate the mySQL database schema. |
    | `grunt populate`    | Populate the database with test data. |
    
    All of these tasks are run if you only type `grunt`.

5. Run the email server.

        python -m smtpd -n -c DebuggingServer localhost:1025

5. Run the server, and provide a secret key to use either as an environment
variable or a command-line parameter.

        node server.js --VOLUNTR_SECRET=dinos
