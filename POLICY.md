# Privacy Policy

Your privacy is important to us. This Privacy Policy details what data **Fable** ("the Bot") collects and how it is managed.

## 1. Data Collected
To provide virtual economy systems, Fable collects and stores the following limited data points:
* **Discord User IDs**: Stored in a local database to associate virtual balances, daily claim cooldowns, and achievements.
* **Server Guild IDs & Channel IDs**: Stored temporarily in-memory or logged in console logs for debugging connection integrity and processing scheduled database backups.

No personal data, email addresses, payment information, or user message content is ever read, collected, or stored by Fable.

## 2. Usage of Data
* Collected user IDs are utilized solely to lookup and update database records corresponding to economy balances.
* Data is stored locally in a secure `node:sqlite` database file on the hosting machine. 
* Automated database backups are compressed in-memory and posted directly to a designated administrator backup channel on Discord.

## 3. Data Sharing & Third Parties
* We do not sell, rent, trade, or share any collected user data with third parties.
* All processes are handled locally within the single-node execution runtime.

## 4. User Rights and Data Deletion
If you wish to have your database records (virtual balance, statistics) deleted from Fable, please contact the bot host administrator or open an issue on the repository to request manual entry deletion.

## 5. Revisions
This Privacy Policy may be updated periodically to reflect database schema alterations or policy changes.
