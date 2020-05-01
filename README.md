# Flight Finder

> Team project at Univeristy of Patras for Electrical and Computer Engineering course Internet Programming.

## Goal

The goal is to build a web application which enables the user not only to search Flights and make a booking but also login/signup along with editing user preferences and viewing travel history.

## Requirements

- Have latest version of Node.js installed.
- Have latest version of Python installed.
  - NOTE: if installing on windows, tick `Add Python to PATH`
- Have Redis installed.
  - For Windows: follow the instructions on [RedisLabs](https://redislabs.com/blog/redis-on-windows-10/).
  - For MacOS: install [brew](https://brew.sh/) and then run `brew install redis`. Finally run `redis-server` to start the server.
- Have MySQL and phpMyAdmin installed.
  - For Windows/Linux: install [MAMP](https://downloads.mamp.info/MAMP-PRO-WINDOWS/releases/4.1.1/MAMP_MAMP_PRO_4.1.1.exe)
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
    - `--debug`: whether to run flask app in debug mode. Defualt: disabled.
    - `--database-user`: database username. **Default: root**.
    - `--database-password`: database password. **Default: "" or root if it's MAMP**.
    - `--database-host`: database host location. **Default: localhost**.
    - `--use-mailgun`: use mailgun service to send emails. **Default: disabled**.
      - `--mailgun-api-key`: mailgun generated api key.
      - `--mailgun-base-url`: mailgun base url server. **Default: US**.
      - `--mailgun-api-domain`: mailgun api assigned domain.
      - `--mailgun-sender-email`: mailgun sender email.

- Navigate to `./config/python_scripts/database` and run `python generate_db.py` without any arguments to create, initialize and fill the database.

  - Accepted arguments:
    - `--create-db`: creates the empty database if not exists.
    - `--init-db`: initializes/resets database with the default values.
    - `--generate-flights`: generates flights.
      - `--days`: specify for how many days to generate flights. **Default: 30**.
  - When the script if finished, we are done with the python part and can safely deactivate the virtual environment by running `deactivate`

> NPM

From the root of the project follow the steps below:

- Run `npm install --global gulp-cli`
- Run `npm install` to install the npm dependencies.
- Run `gulp init` to initialize the static resources.

## Running App

- To run the app in development mode:

  - Run `gulp` or `npm run dev`

    - Accepted arguments:

      - `copy:fonts`: copies the fonts from **src** to **dist** folder.
      - `copy:images`: copies the images after they are optimized from **src** to **dist** folder.
      - `copy:vendors`: copies the vendors from **src** to **dist** folder.
      - `init`: initializes the static resources by running all three previous commands.
      - `clean:images`: deletes the images from the **dist** folder.
      - `clean:vendors`: deletes the vendors from the **dist** folder..
      - `clean:dist`: clears the **dist** folder without deleting the static resources.
      - `clean`: deletes the **dist** folder entirely.

    - NOTE: you need to run `gulp init` to reinitialize the resources after running the clean commands.

- To run the app in production mode:

  - Run `npm run prod`

- To update the packages:
  - Run `npm run update-packages`
  - Run `gulp clean && gulp init`

## Technologies Used

| Area                        | Technology                               |
| --------------------------- | ---------------------------------------- |
| Front-End                   | Bootstrap, HTML5, CSS3, Javascript (ES6) |
| Back-End                    | Node.js, Express.js                      |
| Authentication Middleware   | Passport.js                              |
| In-memory caching/Datastore | Redis                                    |
| Transactional Emails        | Mailgun                                  |
| Database                    | MySQL (MAMP Bundle)                      |
| Deployment                  | Local/Remote                             |

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
