import sys
import re
import secrets
import platform
import argparse

OSX = platform.system() == "Darwin"
WINDOWS = platform.system() == "Windows"
parser = argparse.ArgumentParser()

parser.add_argument(
    "--mysql-host",
    metavar="host",
    type=str,
    default="localhost",
    action="store",
    help="mysql host (default: localhost)",
)

parser.add_argument(
    "--mysql-user",
    metavar="username",
    type=str,
    default="root",
    action="store",
    help="mysql user (default: root)",
)

parser.add_argument(
    "--mysql-password",
    metavar="password",
    type=str,
    default="root" if OSX or WINDOWS else "",
    action="store",
    help="mysql password (default: {password})".format(
        password="root" if OSX or WINDOWS else "None"
    ),
)

parser.add_argument(
    "--mysql-port",
    metavar="port",
    type=int,
    default=3306,
    action="store",
    help="mysql host port (default: 3306)",
)

parser.add_argument(
    "--mysql-database",
    metavar="database",
    type=str,
    default="flightfinder",
    action="store",
    help="mysql database (default: flightfinder)",
)

parser.add_argument(
    "--mongo-uri",
    metavar="uri",
    type=str,
    default="",
    action="store",
    help="mongo full uri (default: None)",
)

parser.add_argument(
    "--mongo-host",
    metavar="host",
    type=str,
    default="localhost",
    action="store",
    help="mongo host (default: localhost)",
)

parser.add_argument(
    "--mongo-port",
    metavar="port",
    type=int,
    default=27107,
    action="store",
    help="mongo host port (default: 27107)",
)

parser.add_argument(
    "--mongo-database",
    metavar="database",
    type=str,
    default="flightfinder",
    action="store",
    help="mongo database (default: flightfinder)",
)

parser.add_argument(
    "--mongo-user",
    metavar="username",
    type=str,
    default="",
    action="store",
    help="mongo user (default: None)",
)

parser.add_argument(
    "--mongo-password",
    metavar="password",
    type=str,
    default="",
    action="store",
    help="mongo password (default: None)",
)

parser.add_argument(
    "--use-mailgun",
    default="",
    action="store_true",
    help="use mailgun service (default: false)",
)

parser.add_argument(
    "--mailgun-api-key",
    metavar="key",
    type=str,
    action="store",
    help="mailgun api key",
)

parser.add_argument(
    "--mailgun-domain",
    metavar="domain",
    type=str,
    action="store",
    help="mailgun api domain",
)

parser.add_argument(
    "--mailgun-base",
    metavar="base",
    type=str,
    action="store",
    help="mailgun base location (default: US)",
)

parser.add_argument(
    "--mailgun-sender-email",
    metavar="email",
    type=str,
    action="store",
    help="mailgun sender email",
)

parser.add_argument(
    "--use-nodemailer",
    default="",
    action="store_true",
    help="use nodemailer (default: false)",
)

parser.add_argument(
    "--nodemailer-host",
    metavar="host",
    type=str,
    action="store",
    help="nodemailer smtp outgoing server",
)

parser.add_argument(
    "--nodemailer-user",
    metavar="email",
    type=str,
    action="store",
    help="nodemailer smtp email",
)

parser.add_argument(
    "--nodemailer-password",
    metavar="password",
    type=str,
    action="store",
    help="nodemailer smtp password",
)

args = parser.parse_args()

if args.mongo_uri:
    pattern = r"^mongodb(?:\+srv)?\:\/\/(?:(?P<user>[_\w]+)?:?(?P<password>[\w]+)?@)?(?P<host>[\.\w]+):?(?P<port>\d+)?/?(?P<database>[_\w]+)?$"
    regex = re.compile(pattern)
    match = regex.search(args.mongo_uri)

    if not match:
        sys.exit("\nERROR: The provided mongo uri is not valid!")

    data = match.groupdict()

    if data["host"] in ["localhost", "127.0.0.1"] and "+srv" in args.mongo_uri:
        args.mongo_uri = args.mongo_uri.replace("+srv", "")

    args.mongo_host = data["host"]
    if data["user"]:
        args.mongo_user = data["user"]
    if data["password"]:
        args.mongo_password = data["password"]
    if data["port"]:
        args.mongo_port = data["port"]
    if data["database"]:
        args.mongo_database = data["database"]

if args.mongo_host not in ["localhost", "127.0.0.1"] and not (
    args.mongo_user or args.mongo_password
):
    parser.error(
        "--mongo-user and --mongo-password can't be empty when --mongo-host is not set to <localhost>"
    )

if not args.mongo_uri:
    new_type = "+srv" if args.mongo_host not in ["localhost", "127.0.0.1"] else ""
    credentials = (
        "{user}:{password}@".format(user=args.mongo_user, password=args.mongo_password)
        if args.mongo_user and args.mongo_password
        else ""
    )
    args.mongo_uri = "mongodb{new_type}://{credentials}{host}:{port}/{database}".format(
        new_type=new_type,
        credentials=credentials,
        host=args.mongo_host,
        port=args.mongo_port,
        database=args.mongo_database,
    )

if args.use_mailgun and args.use_nodemailer:
    parser.error(
        "You can either use mailgun or nodemailer but not both at the same time!"
    )

if (
    args.use_mailgun
    and args.mailgun_base
    and not (args.mailgun_api_key and args.mailgun_domain and args.mailgun_sender_email)
):
    parser.error(
        "You can't use --mailgun-base without --mailgun-api-key, --mailgun-domain and --mailgun-sender-email!"
    )
elif args.use_mailgun and not (
    args.mailgun_api_key and args.mailgun_domain and args.mailgun_sender_email
):
    parser.error(
        "You have to specify --mailgun-api-key, --mailgun-sender-email and --mailgun-domain when using the mailgun service! Optional argument --mailgun-base."
    )
elif not args.use_mailgun and (
    args.mailgun_api_key
    or args.mailgun_domain
    or args.mailgun_sender_email
    or args.mailgun_base
):
    parser.error(
        "You can't pass --mailgun-api-key, --mailgun-domain, --mailgun-sender-email or --mailgun-base without using the mailgun service!"
    )

if args.use_mailgun:
    base = (
        ".{base}".format(base=args.mailgun_base.lower())
        if args.mailgun_base and args.mailgun_base.lower() == "eu"
        else ""
    )
    args.mailgun_base = "api{base}.mailgun.net".format(base=base)

if args.use_nodemailer and not (
    args.nodemailer_host and args.nodemailer_user and args.nodemailer_password
):
    parser.error(
        "You have to specify --nodemailer-host, --nodemailer-user and --nodemailer-password when using the nodemailer!"
    )
elif not args.use_nodemailer and (
    args.nodemailer_host or args.nodemailer_user or args.nodemailer_password
):
    parser.error(
        "You can't pass --nodemailer-host, --nodemailer-user or --nodemailer-password without using the nodemailer!"
    )

args.use_mailgun = None if args.use_mailgun == "" else "true"
args.use_nodemailer = None if args.use_nodemailer == "" else "true"

VARS = {
    "SESSION_SECRET": secrets.token_urlsafe(24),
    "MYSQL_HOST": args.mysql_host,
    "MYSQL_USER": args.mysql_user,
    "MYSQL_PASSWORD": args.mysql_password,
    "MYSQL_PORT": args.mysql_port,
    "MYSQL_DATABASE": args.mysql_database,
    "MONGO_URI": args.mongo_uri,
    "MONGO_HOST": args.mongo_host,
    "MONGO_USER": args.mongo_user,
    "MONGO_PASSWORD": args.mongo_password,
    "MONGO_PORT": args.mongo_port,
    "MONGO_DATABASE": args.mongo_database,
    "MAILGUN_ENABLED": args.use_mailgun,
    "MAILGUN_API_KEY": args.mailgun_api_key,
    "MAILGUN_HOST": args.mailgun_base,
    "MAILGUN_DOMAIN": args.mailgun_domain,
    "MAILGUN_SENDER_EMAIL": args.mailgun_sender_email,
    "NODEMAILER_ENABLED": args.use_nodemailer,
    "NODEMAILER_HOST": args.nodemailer_host,
    "NODEMAILER_USER": args.nodemailer_user,
    "NODEMAILER_PASSWORD": args.nodemailer_password,
}

with open("../../.env", "w") as dotenv:
    print("Generating .env file... ", end="")
    sys.stdout.flush()

    for key, value in VARS.items():
        if value is not None:
            dotenv.write("{key}={value}\n".format(key=key, value=value))
    print("Done!")
