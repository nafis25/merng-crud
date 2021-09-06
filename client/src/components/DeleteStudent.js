import React, { useState } from "react";
import gql from "graphql-tag";
import { useMutation } from "@apollo/react-hooks";

const DeleteStudent = ({ studentId, name }) => {
   const [errors, setErrors] = useState({});
   const [delStudent, { data, loading, error } = {}] =
      useMutation(DELETE_STUDENT);

   const onDelete = async (e) => {
      e.preventDefault();
      console.log("in");
      console.log(studentId);
      try {
         await delStudent({
            variables: { studentId },
         });
         setErrors({});
         window.location.assign("/");
      } catch (err) {
         console.log(err);
         // setErrors(err.graphQLErrors[0].extensions.errors);
      }
   };

   return (
      <div>
         <button
            type="button"
            className="btn btn-danger"
            data-bs-toggle="modal"
            data-bs-target="#deleteModal"
            onClick={onDelete}
         >
            Delete
         </button>
         <div className="modal fade" tabIndex="-1" id="deleteModal">
            <div className="modal-dialog">
               <div className="modal-content">
                  <div className="modal-header">
                     <h5 className="modal-title">Modal title</h5>
                     <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                     ></button>
                  </div>
                  <div className="modal-body">
                     <p>Are you sure you want to delete?</p>
                     <div id="msg">
                        {loading && "Submitting form"}
                        {error && "Submission Error:"}
                        {data && "Submitted"}
                     </div>
                     <p>
                        {Object.keys(errors).length > 0 && (
                           <div>
                              <ul>
                                 {Object.values(errors).map((value) => (
                                    <li
                                       className="text-danger pt-3"
                                       key={value}
                                    >
                                       {value}
                                    </li>
                                 ))}
                              </ul>
                           </div>
                        )}
                     </p>
                  </div>
                  <div className="modal-footer">
                     <button
                        type="button"
                        className="btn btn-secondary"
                        data-bs-dismiss="modal"
                     >
                        Close
                     </button>
                     <button type="submit" className="btn btn-primary">
                        Delete
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

const DELETE_STUDENT = gql`
   mutation deleteStudent($studentId: ID!) {
      deleteStudent(studentId: $studentId)
   }
`;

export default DeleteStudent;
