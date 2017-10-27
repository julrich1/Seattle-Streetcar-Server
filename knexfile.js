module.exports = {
  development: {
    connection: "postgres://localhost/streetcar_dev",
    client: "pg"
  },
  production: {
    connection: {
      database: "streetcar_dev",
      port: 5433,
      user: 'root',
      password: ''
    },
    client: "pg",
  }
};