DROP TABLE IF EXISTS event;
CREATE TABLE event (eventID INT NOT NULL AUTO_INCREMENT,
                    title VARCHAR(50) NOT NULL,
                    description VARCHAR(300) NOT NULL,
                    location VARCHAR(50) NOT NULL,
                    startTime DATETIME NOT NULL,
                    endTime DATETIME NOT NULL,
                    PRIMARY KEY (eventID));

DROP TABLE IF EXISTS users;
CREATE TABLE users (userID INT NOT NULL AUTO_INCREMENT,
                    name VARCHAR(50) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password BINARY(60) NOT NULL,
                    role ENUM('volunteer', 'coordinator'),
                    PRIMARY KEY (userID));

DROP TABLE IF EXISTS time_slot;
CREATE TABLE time_slot (eventID INT NOT NULL, 
                    startTime DATETIME NOT NULL,
                    num_needed INT NOT NULL,
                    num_confirmed INT,
                    PRIMARY KEY (eventID, startTime)
                    FOREIGN KEY (eventID) REFERENCES event(eventID));

DROP TABLE IF EXISTS skills;
CREATE TABLE skills (skillID INT NOT NULL AUTO_INCREMENT,
                    skill_name VARCHAR(75) NOT NULL
                    PRIMARY KEY (skillID)); 

DROP TABLE IF EXISTS review;
CREATE TABLE review (reviewID INT NOT NULL AUTO_INCREMENT,
                    rating INT NOT NULL,
                    CONSTRAINT rating CHECK (rating IN (1, 2, 3, 4)),
                    comment VARCHAR(300)
                    PRIMARY KEY (reviewID));

DROP TABLE IF EXISTS requests;
CREATE TABLE requests(eventID INT NOT NULL,
                    skillID INT NOT NULL, 
                    PRIMARY KEY (eventID, skillID),
                    FOREIGN KEY (eventID) REFERENCES event(eventID),
                    FOREIGN KEY (skillID) REFERENCES skills(skillID));


DROP TABLE IF EXISTS specifies_time_available;
CREATE TABLE specifies_time_available(userID INT NOT NULL,
                    startTime DATETIME NOT NULL
                    PRIMARY KEY (userID, startTime),
                    FOREIGN KEY (userID) REFERENCES users(userID));

DROP TABLE IF EXISTS indicates;
CREATE TABLE indicates(userID INT NOT NULL,
                    skillID INT NOT NULL,
                    PRIMARY KEY(userID, skill)
                    FOREIGN KEY(userID) REFERENCES user(userID),
                    FOREIGN KEY(skillID) REFERENCES skills(skillID));

DROP TABLE IF EXISTS organizes;
CREATE TABLE organizes(userID INT NOT NULL,
                    eventID INT NOT NULL,
                    PRIMARY KEY(userID, eventID),
                    FOREIGN KEY(userID) REFERENCES user(userID),
                    FOREIGN KEY(eventID) REFERENCES event(eventID));

DROP TABLE IF EXISTS registers_for;
CREATE TABLE registers_for(userID INT NOT NULL,
                    eventID INT NOT NULL,
                    startTime DATETIME NOT NULL,
                    confirmed BOOLEAN NOT NULL,
                    PRIMARY KEY(userID, eventID, startTIME),
                    FOREIGN KEY(userID) REFERENCES user(userID),
                    FOREIGN KEY(eventID) REFERENCES time_slot(ev),
                    FOREIGN KEY(startTime) REFERENCES time_slot(startTime));

DROP TABLE IF EXISTS receives_review;
CREATE TABLE receives_review(userID INT NOT NULL,
                    reviewID INT NOT NULL,
                    PRIMARY KEY(userID, reviewID),
                    FOREIGN KEY(userID) REFERENCES user(userID),
                    FOREIGN KEY(reviewID) REFERENCES review(reviewID));

