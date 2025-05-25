import { useCallback } from "react";
import useContractInstance from "./useContractInstance";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { toast } from "react-toastify";
import { ErrorDecoder } from "ethers-decode-error";
import { Contract, ethers, parseUnits } from "ethers";
import cusdTokenABI from "../ABI/cusdToken.json";
import useSignerOrProvider from "./useSignerOrProvider";

const useRepayLoan = () => {
  const contract = useContractInstance(true);
  const { address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const cusdTokenContractAddress = import.meta.env.VITE_CUSD_CONTRACT_ADDRESS;
  const lumenVaultContractAddress = import.meta.env.VITE_LUMEN_VAULT_CONTRACT_ADDRESS;

  const { signer } = useSignerOrProvider();
  const cusdContract = new Contract(cusdTokenContractAddress, cusdTokenABI, signer);

  return useCallback(
    async (loanId, repayment) => {

      if (!loanId) {
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

      if (Number(chainId) !== 44787) {
        toast.error("You're not connected to celo alfajores");
        return;
      }


      
      console.log("Repaying loan with params:", {
        loanId: loanId.toString(),
        repayment: repayment,
        contract: contract.target,
        cusdContract: cusdContract.target,
        chainId,
        user: address,
      });



      try {
        const repaymenInNum = Number(repayment);

        const bigIntRepayment = parseUnits((repaymenInNum * 2).toString(), 18)
        if (repaymenInNum <= 0) {
          toast.error("Repayment amount must be greater than 0");
          return;
        }


        console.log({repaymenInNum, bigIntRepayment, repayment})
      
        // Approve cUSD transfer
        let estimatedGas;
        try {
          estimatedGas = await cusdContract.approve.estimateGas(
            lumenVaultContractAddress,
            bigIntRepayment
          );
        } catch (estimateErr) {
          console.warn("Gas estimation for approve failed:", estimateErr);
          toast.error("Failed to estimate gas for approval");
          return;
        }

        const approveTx = await cusdContract.approve(lumenVaultContractAddress, bigIntRepayment, {
          gasLimit: (estimatedGas * BigInt(120)) / BigInt(100),
          gasPrice: ethers.parseUnits("1", "gwei"), // Fallback
        });

        console.log("Approval transaction sent:", { txHash: approveTx.hash });

        const approveReceipt = await approveTx.wait();
        
        if (approveReceipt.status !== 1) {
          toast.error("CUSD approval failed");
          return;
        }

        // Repay loan
        let estimatedGasLoan;
        try {
          estimatedGasLoan = await contract.repayLoanWithReward.estimateGas(loanId);
        } catch (estimateErr) {
          console.warn("Gas estimation for repayLoanWithReward failed:", estimateErr);
          toast.error("Failed to estimate gas for loan repayment");
          return;
        }

        const repayTx = await contract.repayLoanWithReward(loanId, {
          gasLimit: (estimatedGasLoan * BigInt(120)) / BigInt(100),
          gasPrice: ethers.parseUnits("1", "gwei"), // Fallback
        });

        console.log("Repayment transaction sent:", { txHash: repayTx.hash });

        const repayReceipt = await repayTx.wait();
       

        if (repayReceipt.status === 1) {
          toast.success("Loan repaid successfully!");
          return true;
        } else {
          toast.error("Loan repayment failed");
          return;
        }
      } catch (error) {

        console.error("Error repaying loan:", error);

        try {
          const errorDecoder = ErrorDecoder.create();
          const decodedError = await errorDecoder.decode(error);
          console.error("Decoded error:", decodedError);

          let errorMessage = "Loan repayment failed";
          if (decodedError?.reason) {
            errorMessage = `Loan repayment failed: ${decodedError.reason}`;
          } else if (decodedError?.errorName) {
            errorMessage = `Loan repayment failed: ${decodedError.errorName}`;
          }
          toast.error(errorMessage);
        } catch (decodeErr) {
          console.error("Error decoding the error:", decodeErr);
          toast.error("Loan repayment failed: Unknown issue");
        }
      }
    },
    [contract, address, chainId, cusdContract]
  );
};

export default useRepayLoan;