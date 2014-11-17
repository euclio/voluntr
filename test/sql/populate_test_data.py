from datetime import datetime, timedelta

import mysql.connector


def generate_events(num_events):
    def create_random_event(i):
        name = 'Event %d' % i
        description = 'This event is awesome'
        location = 'Pomona College'
        start_time = datetime.utcnow()
        end_time = start_time + timedelta(hours=3)
        return (name, description, location, start_time, end_time)

    return [create_random_event(i) for i in range(num_events)]


def insert_test_data(connection):
    cursor = connection.cursor()
    cursor.execute('DELETE FROM event')
    events = generate_events(300)
    cursor.executemany('INSERT INTO event VALUES (NULL, %s,%s,%s,%s,%s)',
                       events)
    connection.commit()


if __name__ == '__main__':
    connection = mysql.connector.connect(database='test')
    insert_test_data(connection)
