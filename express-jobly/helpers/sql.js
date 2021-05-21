const { BadRequestError } = require("../expressError");

/** takes in an JSON object.
 * separates the keys and the values. 
 * the originalkeys will be combined into one long string, separated by commas and put into object with setCols as key
 * the original values will be taken out as an array and added in as values with key of values
 * 
 * sqlForPartialUpdate({firstName: 'Aliya', age: 32})
 * returns {setCols: '"first_name"=$1, age"=$2', values: ['Aliya', 32]}
 * . */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
    `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}


/** takes in an JSON query object.
 * if name query exists, add %% around the name's value 
 * then use map to create an array based of strings for WHERE clause
 * 
 * sqlForCompSearch({name: 'ande', maxEmployees: 100, minEmployees:200}) 
 * returns {"where": "LOWER(COL_NAME) LIKE LOWER($1) AND num_employees <=100 AND num_employees >=100}
 * . */

const querySymbol = {
  name: `= `,
  title: `=`,
  minEmployees: `>= `,
  maxEmployees: `<= `,
  minSalary: `>=`,
  equityTrue: `>`,
  equityFalse: `=`
}

function sqlForCompSearch(query) {
  const keys = Object.keys(query);

  if (query.name) {
    query.name = `%${query.name}%`
  }

  const cols = keys.map((keyName, idx) => {
    if (keyName === "name") {
      return `LOWER(name) LIKE LOWER($${idx + 1})`
    }
    return `num_employees ${querySymbol[keyName]}$${idx + 1}`
  }

  );
  let whereString = cols.join(" AND ");

  return {
    "where": whereString,
    "values": Object.values(query)
  }
}

function sqlForJobSearch(query) {
  const keys = Object.keys(query);

  if (query.title) {
    query.title = `%${query.title}%`
  }

  const cols = keys.map((keyName, idx) => {
    if (keyName === "title") {
      return `LOWER(title) LIKE LOWER($${idx + 1})`
    } else if (keyName === "minSalary") {
      return `salary ${querySymbol[keyName]}$${idx + 1}`
    } else if (keyName === "hasEquity") {
      if (query.hasEquity === true) {
        return `equity > $${idx + 1}`
      }
      if (query.hasEquity === false) {
        return `equity >= $${idx + 1}`
      }
    }
  }
  );
  let whereString = cols.join(" AND ");
  query.hasEquity = 0
  return {
    "where": whereString,
    "values": Object.values(query)
  }
}

function checkQuery(arr) {
  const validQuery = ["name", "maxEmployees", "minEmployees"];
  const checkQuery = arr.map(q => validQuery.includes(q));
  return checkQuery.includes(false);
}

function checkJobsQuery(arr) {
  const validQuery = ["title", "minSalary", "hasEquity"];
  const checkQuery = arr.map(q => validQuery.includes(q));
  return checkQuery.includes(false);
}

module.exports = { sqlForPartialUpdate, sqlForCompSearch, checkQuery, sqlForJobSearch, checkJobsQuery };
