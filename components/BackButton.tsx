import { IoArrowBack } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { IoMdArrowBack } from "react-icons/io";

// this is a small component right now but I have to come back and add the full functionality 

export const BackButton = () => {
    const router = useRouter();

    return (
        <button 
            onClick={() => router.back()}
            className="p-1.5 rounded-full bg-[#005596] hover:bg-[#7fbadd] transition-colors">
                <IoMdArrowBack size={20} />
        </button>
    );
};
