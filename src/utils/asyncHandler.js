// method-1: using promises

const asyncHandler = (requestHandler) => 
    (req, res, next) => 
        { Promise.resolve(requestHandler(res, req. next))
            .catch((error) => next(error))

}

export {asyncHandler}


//method-2: using try catch
// const asyncHandler = (func) => async (req, res, next) => {
//     try {
//         await func(res, req, next);
        
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }
// export {asyncHandler}
