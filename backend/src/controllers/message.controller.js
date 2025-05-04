import cloudinary from "../lib/cloudinary.js"
import Message from "../models/message.model.js"
import User from "../models/user.model.js"
import { getReceiverSocketId } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password")
        res.status(200).json(filteredUsers)
    } catch (error) {
        console.log('error')
        res.status(500).json({ error: "Internal Server Error" })
    }
}

export const getMessages = async (req, res) => {
    try {
        const { _id: userToChartId } = req.params
        const myId = req.user._id

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChartId },
                { senderId: userToChartId, receiverId: myId }
            ],
        })

        res.status(200).json(messages)
    } catch (error) {
        console.log("Error in getMessages controller: ", error.messages0)
        res.status(500).json({ error: "Internal Server Error" })
    }
}


export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        console.log('recieved id : ', receiverId)

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });

        await newMessage.save();

        const io = req.app.get("io");

        const receiverSocketId = getReceiverSocketId(receiverId);
        console.log("Receiver socket ID:", receiverSocketId);


        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
            console.log("Message emitted to", receiverSocketId);
          } else {
            console.log(`Receiver with ID ${receiverId} is not online`);
          }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("sendMessage error:", error.message);
        console.error(error.stack);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
