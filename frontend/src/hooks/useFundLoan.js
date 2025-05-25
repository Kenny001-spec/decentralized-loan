import { useCallback } from "react";
import useContractInstance from "./useContractInstance";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { toast } from "react-toastify";
import { ErrorDecoder } from "ethers-decode-error";
import { Contract, ethers } from "ethers"; // Remove BigNumber import
import cusdTokenABI from "../ABI/cusdToken.json";
import useSignerOrProvider from "./useSignerOrProvider";

const useFundLoan = () => {
  const contract = useContractInstance(true);
  const { address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { signer } = useSignerOrProvider();

  const cusdTokenContractAddress = import.meta.env.VITE_CUSD_CONTRACT_ADDRESS;
  const lumenVaultContractAddress = import.meta.env.VITE_LUMEN_VAULT_CONTRACT_ADDRESS;

  const cusdContract = new Contract(cusdTokenContractAddress, cusdTokenABI, signer);

  return useCallback(
    async (loanId) => {
      if (!loanId || isNaN(loanId)) {
        toast.error("Invalid loan ID");
        return;
      }




      if (!address) {
        toast.error("Please connect your wallet");
        return;
      }

      if (!contract || !cusdContract) {
        toast.error("Contract not found");
        return;
      }

      try {


        const loan = await contract.loansCore(loanId);
        const amountWei = loan.amount;
        const status = await contract.loansStatus(loanId);

        if (status.active) {
          toast.error("Loan is already active");
          return;
        }

        const balance = await cusdContract.balanceOf(address);

       

        if (balance < amountWei) {
          toast.error("Insufficient token balance");
          return;
        }

      
        const approveGas = await cusdContract.approve.estimateGas(
          lumenVaultContractAddress,
          amountWei 
        );

        const approveTx = await cusdContract.approve(lumenVaultContractAddress, amountWei , {
          gasLimit: (approveGas * BigInt(120)) / BigInt(100),
        });

        

        const approveReceipt = await approveTx.wait();
 

        if (approveReceipt.status !== 1) {
          toast.error("Token approval failed");
          return;
        }


        const allowance = await cusdContract.allowance(address, lumenVaultContractAddress);


        if (allowance < amountWei) {
          toast.error("Insufficient token allowance");
          return;
        }

        let estimatedGasLoan;
        try {
          estimatedGasLoan = await contract.fundLoan.estimateGas(loanId);
        } catch (gasEstimationError) {
          const decoder = ErrorDecoder.create();
          const decoded = await decoder.decode(gasEstimationError);
          console.error("Gas estimation error:", decoded);
          toast.error(decoded || "Gas estimation failed for loan funding");
          return;
        }

        const txLoan = await contract.fundLoan(loanId, {
          gasLimit: (estimatedGasLoan * BigInt(120)) / BigInt(100),
        });

        const txReceipt = await txLoan.wait();

        if (txReceipt.status === 1) {
          toast.success("Loan funded successfully");
          return true;
          
        } else {
          toast.error("Loan funding failed");
        }
      } catch (error) {
        console.error("Error funding loan:", error);
        const decoder = ErrorDecoder.create();
        const decoded = await decoder.decode(error);
        console.error("Decoded error:", decoded);
        toast.error(decoded?.message || "Loan funding failed");
      }
    },
    [contract, address, chainId, cusdContract]
  );
};

export default useFundLoan;