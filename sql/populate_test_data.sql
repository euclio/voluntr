DROP TABLE IF EXISTS event;
CREATE TABLE event (eventID INT NOT NULL AUTO_INCREMENT,
                    description VARCHAR(300) NOT NULL,
                    location VARCHAR(50) NOT NULL,
                    startTime DATETIME NOT NULL,
                    endTime DATETIME NOT NULL,
                    PRIMARY KEY (eventID));

INSERT INTO event VALUES (0,
                          'This event is awesome.',
                          'Pomona College',
                          '2014-10-28 11:00:00',
                          '2014-10-28 12:00:00');

INSERT INTO event VALUES (0,
                          'This event is also awesome.',
                          'Pomona College',
                          '2014-10-31 11:00:00',
                          '2014-10-31 12:00:00');
