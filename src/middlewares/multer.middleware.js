import multer  from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) { 
    // multer.diskStorage({...}) expects a configuration object.
    // That object must have two specific keys:
    // destination → function that tells Multer where to store the file.
    // filename → function that tells Multer what name to give the file.
    // So we’re writing in key–value pair style (object literal in JavaScript):
    // Key → The property name Multer looks for (destination, filename).
    // Value → The function we provide as logic.
    cb(null, './public/temp')
  },
  filename: function (req, file, cb) {
    
    cb(null, file.originalname)
  }
})

// const upload = multer({ storage: storage })
// Since key and value are same named, we can write this line as ->

export const upload = multer({ storage, })

