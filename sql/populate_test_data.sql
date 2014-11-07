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

INSERT INTO event VALUES (0,
                          'Event title 1',
                          'This event is awesome.',
                          'Pomona College',
                          '2014-10-28 11:00:00',
                          '2014-10-28 12:00:00');

INSERT INTO event VALUES (0,
                          'Event title 2',
                          'This event is also awesome.',
                          'Pomona College',
                          '2014-10-31 11:00:00',
                          '2014-10-31 12:00:00');
