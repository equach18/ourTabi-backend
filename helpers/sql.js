const { BadRequestError } = require("./expressError");

/** sqlForPartialUpdate is a helper function that generates SQL query parts for dynamic updates
 *
 * @param {Object} dataToUpdate - Fields to update.
 * Ex: {firstName: 'Elaine', age: 30}
 *
 * @param {Object} jsToSql - mapping object that converts JavaScript styled keys to SQL style column names.
 *
 * @returns {Object} - Returns an object with two properties:
 *  'setCols' - a string of the SQL columns, which is suitable to be inserted into an UPDATE statement
 * Ex: "first_name"=$1, "age"=$2
 *
 *  'values' - an array of the values from data to update
 * ex: ['Elaine', 30]
 *
 * @throws {BadRequestError} - a bad error request is thrown when dataToUpdate is empty.
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql, fields = []) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0)
    throw new BadRequestError("No fields provided to update.");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
