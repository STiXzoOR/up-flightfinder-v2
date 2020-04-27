from pymysql.cursors import DictCursor, Cursor
from datetime import datetime, timedelta
from dotenv import dotenv_values
from faker import Faker
import argparse
import pymysql
import csv
import os
import json
import platform
import warnings
import sys

OSX = platform.system() == "Darwin"
current_dir = os.getcwd()
config = dotenv_values()
fake = Faker()


def print_stmt(stmt=""):
    print(stmt, end="")
    sys.stdout.flush()


def create_connection(database=config.get("DB_NAME")):
    options = {
        "host": config.get("DB_HOST"),
        "user": config.get("DB_USER"),
        "password": config.get("DB_PASSWORD"),
        "database": database,
        "charset": "utf8mb4",
        "cursorclass": DictCursor,
    }

    if OSX:
        options.update({"unix_socket": "/Applications/MAMP/tmp/mysql/mysql.sock"})

    return pymysql.connect(**options)


def database_exists():
    query = """
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name="{database}"
    """.format(
        database=config.get("DB_NAME")
    )

    cnx = create_connection(database="")
    cursor = cnx.cursor()
    cursor.execute(query)
    result = cursor.fetchone()
    cursor.close()
    cnx.close()

    return result is not None


def database_is_empty():
    query = """
    SHOW tables
    """

    cnx = create_connection()
    cursor = cnx.cursor()
    cursor.execute(query)
    result = cursor.fetchall()
    cursor.close()
    cnx.close()

    return len(result) == 0


def table_exists(table=""):
    query = """
    SHOW tables LIKE %s
    """

    cnx = create_connection()
    cursor = cnx.cursor(Cursor)
    cursor.execute(query, (table))
    result = cursor.fetchone()
    cursor.close()
    cnx.close()

    return result is not None


def parse_sql(file):
    stmts = []
    DELIMITER = ";"
    stmt = ""

    with open(file, "r") as db_schema:
        data = db_schema.readlines()
        for line in data:
            if not line.strip():
                continue

            if line.startswith("--"):
                continue

            if "DELIMITER" in line:
                DELIMITER = line.split()[1]
                continue

            if DELIMITER not in line:
                stmt += line.replace(DELIMITER, ";")
                continue

            if stmt:
                stmt += line
                stmts.append(stmt.strip())
                stmt = ""
            else:
                stmts.append(line.strip())

    return stmts


def create_database():
    print_stmt("Creating database... ")

    query = """
    CREATE DATABASE IF NOT EXISTS {database}
    """.format(
        database=config.get("DB_NAME")
    )

    cnx = create_connection(database="")
    cursor = cnx.cursor()
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore")
        cursor.execute(query)
    cursor.close()
    cnx.commit()
    cnx.close()

    print("Done!")


def init_database():
    print_stmt("Importing schema file... ")

    stmts = parse_sql(current_dir + "/schema.sql")
    cnx = create_connection()

    with cnx.cursor() as cursor:
        for stmt in stmts:
            try:
                with warnings.catch_warnings():
                    warnings.filterwarnings("ignore")
                    cursor.execute(stmt)
            except (
                pymysql.err.DatabaseError,
                pymysql.err.IntegrityError,
                pymysql.err.MySQLError,
            ) as e:
                print(e)
                print(stmt)
                exit(1)
        cnx.commit()

    cnx.close()
    print("Done!")


def generate_flights(days=30):
    print_stmt("Generating flights... ")

    def _cleanup_flights():
        query = """
        DELETE FROM flight
        WHERE dep_date < CURRENT_DATE and arr_date < CURRENT_DATE
        """

        cursor = cnx.cursor()
        cursor.execute(query)
        cursor.close()
        cnx.commit()

    def _generate_id(prefix=""):
        query = """
        SELECT flight_id 
        FROM flight
        WHERE flight_id=%s
        GROUP BY flight_id
        """

        cursor = cnx.cursor()

        flight_id = prefix + fake.numerify(text="###")
        cursor.execute(query, flight_id)
        result = cursor.fetchone()
        while result is not None:
            flight_id = prefix + fake.numerify(text="###")
            cursor.execute(query, flight_id)
            result = cursor.fetchone()
        cursor.close()

        return flight_id

    def _get_start_date():
        query = """
        SELECT MAX(arr_date) as max_date
        FROM flight
        """

        cnx = create_connection()
        cursor = cnx.cursor()
        cursor.execute(query)
        result = cursor.fetchone()["max_date"]
        cursor.close()
        cnx.close()

        return (
            result + timedelta(days=1) if result is not None else datetime.now().date()
        )

    durations = {}
    time_multiplier = 4
    classes = ["Economy", "Business", "First Class"]
    date_start = today = _get_start_date()
    date_end = date_start + timedelta(days=days)

    with open(current_dir + "/data/routes_durations.json", mode="r") as file:
        durations = json.load(file)

    with open(current_dir + "/data/routes.csv", mode="r") as input_csv:
        csv_reader = csv.DictReader(
            input_csv, delimiter=";", fieldnames=["airline", "from", "to", "airplane"]
        )

        cnx = create_connection()
        _cleanup_flights()

        for row in csv_reader:
            if row["airline"] != "":
                airline = row["airline"]
                from_airport = row["from"]
                to_airport = row["to"]
                airplane = row["airplane"]
                duration = durations[from_airport][to_airport]
                duration = datetime.strptime(duration[:-3], "%H:%M")

                for klass in classes:
                    hours = []
                    minutes = []
                    while len(hours) < time_multiplier:
                        hour = fake.random_int(0, 23)
                        if hour not in hours:
                            hours.append(hour)

                    while len(minutes) < time_multiplier:
                        minute = fake.random_int(0, 55, step=5)
                        if minute not in minutes:
                            minutes.append(minute)

                    while hours and minutes:
                        flight_id = _generate_id(airline)

                        hour = hours.pop(fake.random_int(0, len(hours) - 1))
                        minute = minutes.pop(fake.random_int(0, len(minutes) - 1))
                        date = "{Y}-{m}-{d} {H}:{M}".format(
                            Y=today.year, m=today.month, d=today.day, H=hour, M=minute
                        )

                        dep_date = datetime.strptime(date, "%Y-%m-%d %H:%M")
                        arr_date = dep_date + timedelta(
                            hours=duration.hour, minutes=duration.minute
                        )
                        date_start = today
                        while date_start <= date_end:
                            prices = {
                                "Economy": {
                                    "price": fake.random_int(min=70, max=300, step=1),
                                    "change": 30,
                                    "cancel": 60,
                                },
                                "Business": {
                                    "price": fake.random_int(min=150, max=650, step=1),
                                    "change": 70,
                                    "cancel": 140,
                                },
                                "First Class": {
                                    "price": fake.random_int(min=260, max=1000, step=1),
                                    "change": 125,
                                    "cancel": 250,
                                },
                            }

                            for key, val in prices.items():
                                val.update(
                                    {
                                        "taxes": val["price"]
                                        - (
                                            (
                                                fake.random_int(min=24, max=65, step=1)
                                                / 100
                                            )
                                            * val["price"]
                                        )
                                    }
                                )

                            price = prices[klass]["price"]
                            change = prices[klass]["change"]
                            cancel = prices[klass]["cancel"]
                            taxes = prices[klass]["taxes"]
                            arr_date = dep_date + timedelta(
                                hours=duration.hour, minutes=duration.minute
                            )

                            flight_record = {
                                "flight_id": flight_id,
                                "airline": airline,
                                "airplane": airplane,
                                "from_airport": from_airport,
                                "to_airport": to_airport,
                                "dep_date": dep_date.date(),
                                "dep_time": dep_date.time(),
                                "arr_date": arr_date.date(),
                                "arr_time": arr_date.time(),
                                "duration": duration.time(),
                                "class": klass,
                                "price": price,
                                "change_fee": change,
                                "cancel_fee": cancel,
                                "taxes": taxes,
                                "discount": 0,
                                "occupied_capacity": 0,
                                "status": "UPCOMING",
                            }

                            fields = []
                            values = []
                            for key in flight_record.keys():
                                fields.append(key)
                                values.append("%({key})s".format(key=key))

                            fields = ", ".join(fields)
                            values = ", ".join(values)
                            query = "INSERT INTO flight ({fields}) VALUES ({values})".format(
                                fields=fields, values=values
                            )

                            cursor = cnx.cursor()
                            cursor.execute(query, flight_record)
                            cnx.commit()
                            cursor.close()

                            dep_date += timedelta(days=1)
                            date_start += timedelta(days=1)
    cnx.close()
    print("Done!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--create-db", action="store_true", help="create database",
    )
    parser.add_argument(
        "--init-db", action="store_true", help="initialize database",
    )
    parser.add_argument(
        "--generate-flights", action="store_true", help="generate flights",
    )
    parser.add_argument(
        "--days",
        metavar="days",
        type=int,
        default=30,
        action="store",
        help="specify for how many days to generate flights",
    )

    args = parser.parse_args()

    if args.create_db:
        if database_exists():
            parser.error("Database already exists, no need to recreate it!")

        create_database()
    elif args.init_db:
        if not database_exists():
            parser.error("Database doesn't exists. Please run --create-db first!")

        answer = input(
            "This will reset your database, are you sure you want to continue?[yes/no]: "
        )
        while answer.lower() not in ["yes", "no"]:
            answer = input("Please answer with <yes> or <no>: ")

        if answer.lower() == "no":
            exit(0)

        init_database()
    elif not args.generate_flights and args.days:
        parser.error("You can't use this command with the --generate-flights command")
    elif args.generate_flights:
        if not database_exists():
            parser.error(
                "Database doesn't exists. Please run --create-db and --init-db first!"
            )
        elif database_is_empty() or not table_exists(table="flight"):
            parser.error("Database is empty or corrupted. Please run --init-db first!")

        generate_flights(days=30 if not args.days else args.days)
    else:
        create_database()
        init_database()
        generate_flights()
