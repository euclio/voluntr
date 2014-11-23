from datetime import datetime, timedelta
import random

import bcrypt
import mysql.connector


def generate_users(num_users):
    def create_random_user(i):
        name = 'Test user %d' % i
        email = 'test%d@example.com' % i
        unhashed_password = 'test%d' % i
        password = bcrypt.hashpw(unhashed_password, bcrypt.gensalt(10))
        role = random.choice(['volunteer', 'coordinator'])
        return (name, email, password, role)

    return [create_random_user(i) for i in range(num_users)]


def generate_events(num_events):
    def create_random_event(i):
        name = 'Event %d' % i
        description = 'This event is awesome'
        location = 'Pomona College'
        start_time = datetime.utcnow()
        end_time = start_time + timedelta(hours=3)
        return (name, description, location, start_time, end_time)

    return [create_random_event(i) for i in range(num_events)]


def generate_skills():
    skills = [
        'First Aid',
        'Children',
        'Animals',
        'Programming',
        'Cooking'
    ]

    return [(skill,) for skill in skills]


def insert_test_data(connection):
    cursor = connection.cursor()
    cursor.execute('DELETE FROM event')
    events = generate_events(300)
    cursor.executemany('INSERT INTO event VALUES (NULL, %s, %s, %s, %s, %s)',
                       events)

    cursor.execute('DELETE FROM user')
    users = generate_users(20)
    cursor.executemany('INSERT INTO user VALUES (NULL, %s, %s, %s, %s)',
                       users)
    cursor.execute('DELETE FROM skill')
    skills = generate_skills()
    cursor.executemany('INSERT INTO skill VALUES (NULL, %s)', skills)
    connection.commit()


if __name__ == '__main__':
    connection = mysql.connector.connect(database='test')
    insert_test_data(connection)
