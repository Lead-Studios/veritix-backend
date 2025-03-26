module.exports = (err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  };
  