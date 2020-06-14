import sys
import secrets
import platform
import argparse

OSX = platform.system() == "Darwin"
WINDOWS = platform.system() == "Windows"
parser = argparse.ArgumentParser()

parser.add_argument(
    "--database-host",
    metavar="host",
    type=str,
    default="localhost",
    action="store",
    help="database host to connect (default: localhost)",
)

parser.add_argument(
    "--database-user",
    metavar="username",
    type=str,
    default="root",
    action="store",
    help="database user to connect (default: root)",
)

parser.add_argument(
    "--database-password",
    metavar="password",
    type=str,
    default="root" if OSX or WINDOWS else "",
    action="store",
    help="database password to connect (default: {password})".format(
        password="root" if OSX or WINDOWS else "None"
    ),
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
    "DB_NAME": "flightfinder",
    "DB_HOST": args.database_host,
    "DB_USER": args.database_user,
    "DB_PASSWORD": args.database_password,
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
