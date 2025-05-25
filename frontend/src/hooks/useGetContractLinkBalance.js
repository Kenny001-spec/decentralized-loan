import { useCallback } from "react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { toast } from "react-toastify";
import { ErrorDecoder } from "ethers-decode-error";
import { Contract, formatUnits } from "ethers";
import cusdTokenABI from "../ABI/cusdToken.json"
import useSignerOrProvider from "./useSignerOrProvider";


const useGetContractLinkBalance = () => {
  const { address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { readOnlyProvider } = useSignerOrProvider()
  const cusdTokenContractAddress = import.meta.env.VITE_CUSD_CONTRACT_ADDRESS;
  const lumenVaultContractAddress = import.meta.env.VITE_LUMEN_VAULT_CONTRACT_ADDRESS;

  const cusdTokenContract = new Contract(cusdTokenContractAddress, cusdTokenABI, readOnlyProvider);

  return useCallback(
    async () => {

      if (!cusdTokenContract) {
        toast.error("Contract not found");
        return;
      }


      try {

        const contractLinkBalance = await cusdTokenContract.balanceOf(String(lumenVaultContractAddress).toString());

        return formatUnits(String(contractLinkBalance), 18)



      } catch (error) {
        console.error("error fetching balance", error);

        const errorDecoder = ErrorDecoder.create();
        const decodedError = await errorDecoder.decode(error);

        console.error("Decoded Error:", decodedError);
      }
    },
    [address, chainId, cusdTokenContract]
  );
};

export default useGetContractLinkBalance;

