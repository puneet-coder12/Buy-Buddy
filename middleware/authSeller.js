const { prisma } = require("@/src/db")


const authSeller = async (userId) =>{
    try {
        const user = await prisma.user.findUnique({
            where:{id:userId}, 
            include:{store:true},
        })

        if(user.store){
            if(user.store.status === "APPROVED"){
                return user.store.id
            } else {
                return false
            }
        }
    } catch (error) {
        console.log(error);
        return false
    }
}

export default authSeller;