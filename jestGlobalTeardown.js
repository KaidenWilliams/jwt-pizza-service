module.exports = async () => {
  await global.__MYSQL_CONTAINER__.stop();
  await global.__MYSQL_CONTAINER__.remove();
};
