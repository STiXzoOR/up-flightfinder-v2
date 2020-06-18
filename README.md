# Flight Finder

> Team project at Univeristy of Patras for Electrical and Computer Engineering course Internet Programming.

## Goal

The goal is to build a web application which enables the user not only to search Flights and make a booking but also login/signup along with editing user preferences and viewing travel history.

## Requirements

- Have latest MongoDB installed.
  - NOTE: create a [cluster](https://docs.atlas.mongodb.com/tutorial/create-new-cluster/) if local server is not an option.
- Have latest version of Node.js installed.
- Have latest version of Python installed.
  - NOTE: if installing on windows, tick `Add Python to PATH`
- Have MySQL and phpMyAdmin installed.
  - For Windows: install [MAMP](https://downloads.mamp.info/MAMP-PRO-WINDOWS/releases/4.1.1/MAMP_MAMP_PRO_4.1.1.exe)
  - For MacOS: install [MAMP](https://downloads.mamp.info/MAMP-PRO/releases/5.7/MAMP_MAMP_PRO_5.7.pkg)

## Project Setup

- Clone the repo or download as zip.
- Navigate to the folder where you cloned/extracted the repo.

> PYTHON

- Navigate to `./config/python_scripts` and create a virtual environment.
  - Run `python -m venv venv` to initialize it.
  - To activate it:
    - On Windows: Run `venv\Scripts\activate`
    - On MacOS/Linux: Run `source venv/bin/activate`
- Run `pip install -r requirements.txt` to install the python dependencies.
- Run `python generate_dotenv.py` without any arguments to generate the default .env file.

  - Accepted arguments:

    - `--mysql-user`: mysql username. **Default: root**.
    - `--mysql-password`: mysql password. **Default: "" or root if it's MAMP**.
    - `--mysql-host`: mysql host. **Default: localhost**.
    - `--mysql-port`: mysql host port. **Default: 3306**.
    - `--mysql-database`: mysql default database. **Default: flightfinder**.
    - `--mongo-uri`: mongo full uri string. **Default: ""**.
    - `--mongo-user`: mongo username. **Default: ""**.
    - `--mongo-password`: mongo password. **Default: ""**.
    - `--mongo-host`: mongo host. **Default: localhost**.
    - `--mongo-port`: mongo host port. **Default: 27107**.
    - `--mongo-database`: mongo default database. **Default: flightfinder**.
    - `--use-mailgun`: use mailgun service to send emails. **Default: disabled**.
      - `--mailgun-api-key`: mailgun generated api key.
      - `--mailgun-base`: mailgun base url server. **Default: US**.
      - `--mailgun-domain`: mailgun api assigned domain.
      - `--mailgun-sender-email`: mailgun sender email.
    - `--use-nodemailer`: use nodemailer to send emails. **Default: disabled**.
      - `--nodemailer-host`: nodemailer smtp server.
      - `--nodemailer-user`: nodemailer smtp email.
      - `--nodemailer-password`: nodemailer smtp password.

  - **NOTES**
    - If mongo uri is used, it will ovveride all the other mongo arguments. Either use only or set each argument individually.
    - Mailgun and nodemailer can't be used together. Use only one of them.
    - If you are using your Gmail account for the nodemailer, make sure to configure your account to allow [Less Secure Apps](https://www.google.com/settings/security/lesssecureapps) and complete the [Captcha Enable](https://accounts.google.com/b/0/displayunlockcaptcha) challenge.

  Example: `python generate_dotenv.py --mysql-user flightfinder --mysql-password test-flight --mongo-uri "mongodb+srv://<username>:<password>@<cluster-domain>.mongodb.net/<database>"`

- Navigate to `./config/python_scripts/database` and run `python generate_db.py` without any arguments to create, initialize and fill the database.

  - Accepted arguments:

    - `--create-db`: creates the empty database if not exists.
    - `--init-db`: initializes/resets database with the default values.
    - `--generate-flights`: generates flights.
      - `--days`: specify for how many days to generate flights. **Default: 30**.

    Example: `python generate_db.py --generate-flights --days 60`

  - When the script if finished, we are done with the python part and can safely deactivate the virtual environment:
    - On Windows: Run `venv\Scripts\deactivate`
    - On MacOS/Linux: Run `deactivate`

> NPM

From the root of the project follow the steps below:

- Run `npm install --global gulp-cli`
- Run `npm install` to install the npm dependencies.
- Run `gulp build:dlean-dev` to build the static resources.

  - Accepted arguments:

    - `init`: initializes the static resources (fonts, images, vendors).
    - `build`: builds source files from **src** to **dist** folder for production mode.
    - `build:dev`: builds source files from **src** to **dist** folder for development mode without initializing static resources.
    - `build:clean-dev`: initializes static resources and builds source files from **src** to **dist** folder for development mode.
    - `copy:fonts`: copies the fonts from **src** to **dist** folder.
    - `copy:images`: copies the images after they are optimized from **src** to **dist** folder.
    - `copy:vendors`: copies the vendors from **src** to **dist** folder.
    - `copy:src`: copies everything from **src** to **dist** folder.
    - `clean:fonts`: deletes the fonts from the **dist** folder.
    - `clean:images`: deletes the images from the **dist** folder.
    - `clean:vendors`: deletes the vendors from the **dist** folder.
    - `clean:dist`: clears the **dist** folder without deleting the static resources.
    - `clean`: deletes the **dist** folder entirely.

    - NOTE: you need to run `gulp init` to reinitialize the resources after running the clean command.

## Running App

- To run the app in development mode:

  - Run `npm run development`

- To run the app in production mode:

  - Run `npm run production`

- To run the app in maintenance mode:

  - Navigate to `./config` folder and open the generated file `maintenance_key.json`
  - Copy the key and then run:

    - To enable it: `curl --location --request POST 'http://ENTER_APP_URL/maintenance/on' --header 'X-Maintenance-Key: ENTER_MAINTENANCE_KEY`

    - To disable it: `curl --location --request POST 'http://ENTER_APP_URL/maintenance/off' --header 'X-Maintenance-Key: ENTER_MAINTENANCE_KEY`

- To update the packages:

  - Run `npm run update-packages`

## Deploying App

- Coming soon

## Technologies Used

| Area                      | Technology                               |
| ------------------------- | ---------------------------------------- |
| Frontend                  | Bootstrap, HTML5, CSS3, Javascript (ES6) |
| Backend                   | Node.js, Express.js, Pug.js              |
| Session datastore         | MongoDB                                  |
| Authentication middleware | Passport.js                              |
| Data validation middlware | Express superstruct                      |
| Transactional emails      | Mailgun/Nodemailer                       |
| Logger                    | Morgan + Winston                         |
| Database                  | MySQL                                    |
| Deployment                | Local/Remote (Custom server)             |

## Authors

| [![Neoptolemos Kyriakou](https://avatars2.githubusercontent.com/u/23358296?v=3&s=70)](https://github.com/STiXzoOR) | [![Giannis Michailou](https://avatars0.githubusercontent.com/u/61234053?v=4&s=70)](https://github.com/giannismich) |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [Neoptolemos Kyriakou](https://github.com/STiXzoOR)                                                                | [Giannis Michailou](https://github.com/giannismich)                                                                |

## Credits

- [Bootstrap](https://getbootstrap.com/) for the frontend framework.
- [Rajendra](https://www.behance.net/gallery/1041969/FlightFinder-Logo-Design) for the logo icon.
- [UnDraw](https://undraw.co/) for the used illustrations.
- [Unsplash](https://unsplash.com/) for the images.

## LICENSE

- This project is licensed under the MIT License - see the [LICENSE](https://github.com/STiXzoOR/up-flightfinder-v2/blob/master/LICENSE) file for details.
