from datetime import datetime, timedelta

import bcrypt
import mysql.connector


def generate_users(num_users):
    def create_random_user(i):
        name = 'Test user %d' % i
        email = 'test%d@example.com' % i
        unhashed_password = 'test%d' % i
        password = bcrypt.hashpw(unhashed_password, bcrypt.gensalt(10))
        role = ['volunteer', 'coordinator'][i % 2]
        return (name, email, password, role)

    return [create_random_user(i) for i in range(num_users)]


def generate_events(num_events):
    def create_random_event(i):
        name = 'Event %d' % i
        description = 'This event is awesome'
        location = 'Pomona College'
        start_time = datetime.now().replace(second=0)
        end_time = start_time + timedelta(hours=3)
        return (name, description, location, start_time, end_time)

    return [create_random_event(i) for i in range(num_events)]


def generate_skills():
    skills = [
        'First Aid',
        'Children',
        'Animals',
        'Programming',
        'Cooking',
        'Sales',
        'Arts and Crafts',
        'Foreign Language',
        'Gardening',
        'Reading',
        'Building/Construction',
        'Music'
        #add additional skills
    ]

    return [(skill,) for skill in skills]


def insert_test_data(connection):
    cursor = connection.cursor()

    #testing user
    cursor.execute('DELETE FROM user')
    users = generate_users(20)
    cursor.executemany('INSERT INTO user VALUES (NULL, %s, %s, %s, %s)',
                       users)

    #testing event
    cursor.execute('DELETE FROM event')
    events = generate_events(300)
    cursor.executemany('INSERT INTO event VALUES (NULL, %s, %s, %s, %s, %s)',
                       events)
    
    half_hour = timedelta(minutes=30)
    multi_day = timedelta(days=2)
    #class datetime.timedelta([days[, seconds[, microseconds[, milliseconds[, minutes[, hours[, weeks]]]]]]])
    
    start_event1 = datetime(2014, 12, 15, 18, 45)
    # datetime.time(['year', 'month', 'day', 'hour', 'minute', 'second', 'microsecond'])

    #test for 30 min event
    cursor.execute("INSERT INTO event (eventID, title, description, location, startTime, endTime) "
                   "VALUES (NULL, %s, %s, %s, %s, %s)",
                   ('30_mins_event', 'We do magical things in this event',
                    'Somewhere in California', start_event1,
                    start_event1 + half_hour))
    #test for a multi-day event
    cursor.execute("INSERT INTO event (eventID, title, description, location, startTime, endTime) "
                   "VALUES (NULL, %s, %s, %s, %s, %s)",
                   ('multiDay_event', 'We do coding things in this event',
                    'Somewhere in Washington', start_event1,
                    start_event1 + multi_day))

    #testing skill
    cursor.execute('DELETE FROM skill')
    skills = generate_skills()
    cursor.executemany('INSERT INTO skill VALUES (NULL, %s)', skills)


    #test indicate skill
    cursor.execute('DELETE FROM indicate')
    cursor.execute("INSERT INTO indicate (userID, skillID)"
                   "VALUES (%s, %s)", (1, 3))
    cursor.execute("INSERT INTO indicate (userID, skillID)"
                   "VALUES (%s, %s)", (2, 1))

    #test time_slot
    cursor.execute('DELETE FROM time_slot')
    cursor.execute("INSERT INTO time_slot (eventID, startTime, num_needed, num_confirmed)"
                   "VALUES (%s, %s, %s, %s)",
                   (1, cursor.execute("SELECT startTime FROM event WHERE time_slot.eventID = event.eventID"), 5, 2))


    connection.commit()

if __name__ == '__main__':
    connection = mysql.connector.connect(database='test')
    insert_test_data(connection)
