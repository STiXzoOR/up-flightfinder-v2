import sys
import secrets
import platform
import argparse

OSX = platform.system() == "Darwin"
WINDOWS = platform.system() == "Windows"
parser = argparse.ArgumentParser()

parser.add_argument(
    "--debug",
    default=False,
    action="store_true",
    help="enabled debugging mode (default: disabled)",
)
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
    default=False,
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
    "--mailgun-api-domain",
    metavar="domain",
    type=str,
    action="store",
    help="mailgun api domain",
)

parser.add_argument(
    "--mailgun-base-url",
    metavar="url",
    type=str,
    action="store",
    help="mailgun base url",
)

parser.add_argument(
    "--mailgun-sender-email",
    metavar="email",
    type=str,
    action="store",
    help="mailgun sender email",
)

args = parser.parse_args()

if (
    args.use_mailgun
    and args.mailgun_base_url
    and not (
        args.mailgun_api_key and args.mailgun_api_domain and args.mailgun_sender_email
    )
):
    parser.error(
        "You can't use --mailgun-base-url without --mailgun-api-key, --mailgun-api-domain and --mailgun-sender-email!"
    )
elif args.use_mailgun and not (
    args.mailgun_api_key and args.mailgun_api_domain and args.mailgun_sender_email
):
    parser.error(
        "You have to specify --mailgun-api-key, --mailgun-sender-email and --mailgun-api-domain when using the mailgun service! Optional argument --mailgun-base-url."
    )
elif not args.use_mailgun and (
    args.mailgun_api_key
    or args.mailgun_api_domain
    or args.mailgun_sender_email
    or args.mailgun_base_url
):
    parser.error(
        "You can't pass --mailgun-api-key, --mailgun-api-domain, --mailgun-sender-email or --mailgun-base-url without using the mailgun service!"
    )

if args.use_mailgun:
    base = (
        ".{base}".format(base=args.mailgun_base_url.lower())
        if args.mailgun_base_url and args.mailgun_base_url.lower() == "eu"
        else ""
    )
    args.mailgun_base_url = "https://api{base}.mailgun.net/v3".format(base=base)

VARS = {
    "DEBUG_STATUS": args.debug,
    "SECRET_KEY": secrets.token_urlsafe(24),
    "SECURITY_EMAIL_SALT": secrets.token_urlsafe(24),
    "SECURITY_PASSWORD_SALT": secrets.token_urlsafe(24),
    "SECURITY_NEWSLETTER_SALT": secrets.token_urlsafe(24) if args.use_mailgun else None,
    "DB_NAME": "flightfinder",
    "DB_HOST": args.database_host,
    "DB_USER": args.database_user,
    "DB_PASSWORD": args.database_password,
    "MAILGUN_ENABLED": args.use_mailgun,
    "MAILGUN_API_KEY": args.mailgun_api_key,
    "MAILGUN_API_BASE_URL": args.mailgun_base_url,
    "MAILGUN_API_DOMAIN": args.mailgun_api_domain,
    "MAILGUN_API_SENDER_EMAIL": args.mailgun_sender_email,
}

with open("../../.env", "w") as dotenv:
    print("Generating .env file... ", end="")
    sys.stdout.flush()

    for key, value in VARS.items():
        if value is not None:
            dotenv.write("{key}={value}\n".format(key=key, value=value))
    print("Done!")
